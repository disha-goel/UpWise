import { Router, Request, Response } from 'express';
import {
  hashPassword,
  verifyPassword,
  createToken,
  invalidateToken,
} from '../services/authService.js';
import {
  findUserByEmail,
  findUserById,
  createUserRecord,
  updateUserPreferences,
  sanitizeUser,
} from '../services/userStore.js';
import { requireAuth, extractUserFromRequest } from '../middlewares/authMiddleware.js';

const router = Router();

export { extractUserFromRequest as extractAuthUser };

// ----------------------------------------------------------------------
// 1. User Registration
// ----------------------------------------------------------------------
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, city, language, topics, interests } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required (minimum 2 characters)',
      });
    }

    if (
      !email ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        error: 'A valid email address is required',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    const initialTopics = Array.isArray(topics) ? topics.map(String) : [];
    const initialInterests = Array.isArray(interests) ? interests.map(String) : [];
    const passwordHash = hashPassword(password);

    const safeUser = await createUserRecord({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      city: city && typeof city === 'string' ? city.trim() : null,
      language: language === 'hi' ? 'hi' : 'en',
      topics: initialTopics,
      interests: initialInterests,
    });

    const token = createToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: safeUser,
    });
  } catch (error) {
    const message = (error as Error).message;
    res.status(message.includes('already exists') ? 409 : 500).json({ success: false, error: message });
  }
});

// ----------------------------------------------------------------------
// 2. User Login
// ----------------------------------------------------------------------
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !user.password || !verifyPassword(String(password), user.password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const safeUser = sanitizeUser(user);

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ----------------------------------------------------------------------
// 3. User Logout
// ----------------------------------------------------------------------
router.post('/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      invalidateToken(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ----------------------------------------------------------------------
// 4. Current User Verification (`GET /me`)
// ----------------------------------------------------------------------
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ----------------------------------------------------------------------
// 5. User Preferences (Protected)
// ----------------------------------------------------------------------
router.get(['/preferences', '/me/preferences'], requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      preferences: {
        categories: user.interests || [],
        topics: user.topics || [],
        city: user.city || null,
        language: user.language || 'en',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put(['/preferences', '/me/preferences'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { categories, topics, city, language } = req.body;
    const userId = req.user!.id;

    const updatedUser = await updateUserPreferences(userId, {
      categories: Array.isArray(categories) ? categories.map(String) : undefined,
      topics: Array.isArray(topics) ? topics.map(String) : undefined,
      city: city !== undefined ? (typeof city === 'string' && city.trim() ? city.trim() : null) : undefined,
      language: language === 'hi' || language === 'en' ? language : undefined,
    });

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: {
        categories: updatedUser.interests || [],
        topics: updatedUser.topics || [],
        city: updatedUser.city || null,
        language: updatedUser.language || 'en',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ----------------------------------------------------------------------
// 6. Forgot Password (Safe recovery message)
// ----------------------------------------------------------------------
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    res.json({
      success: true,
      message: 'If an account exists for this email, password recovery instructions have been sent.',
      accountFound: Boolean(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
