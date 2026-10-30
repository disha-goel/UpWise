import crypto from 'crypto';
import prisma from '../db.js';
import { readUsersFromFile, isDemoUser, reconcileUserId } from './userStore.js';
import { getJwtSecret, demoUsersEnabled } from '../config.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'reviewer' | 'admin';
  city?: string | null;
  language?: string;
  topics?: string[];
  interests?: string[];
  createdAt: string | Date;
}

// In-memory blacklist for invalidated tokens upon logout
const invalidatedTokens = new Set<string>();

export function invalidateToken(token: string): void {
  if (token) {
    invalidatedTokens.add(token.trim());
  }
}

export function isTokenInvalidated(token: string): boolean {
  return invalidatedTokens.has(token.trim());
}

// Password hashing using Node built-in pbkdf2 with 10,000 iterations and sha512
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  if (!salt || !originalHash) return false;

  const iterations = 10000;
  let computedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');

  // Fallback check for older hashes with 1000 iterations
  if (computedHash !== originalHash) {
    const legacyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    if (legacyHash === originalHash) {
      computedHash = legacyHash;
    }
  }

  try {
    const compBuf = Buffer.from(computedHash, 'hex');
    const origBuf = Buffer.from(originalHash, 'hex');
    if (compBuf.length !== origBuf.length) return false;
    return crypto.timingSafeEqual(compBuf, origBuf);
  } catch {
    return false;
  }
}

// Cryptographically signed HMAC-SHA256 JWT generator
export function createToken(user: { id: string; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      jti: crypto.randomUUID(),
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// Token verification with signature validation, expiration, and invalidation checks
export function verifyToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    if (!token || isTokenInvalidated(token)) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data || typeof data.sub !== 'string' || !data.sub || typeof data.email !== 'string' || !['user', 'reviewer', 'admin'].includes(data.role) || typeof data.exp !== 'number' || !Number.isFinite(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return data;
  } catch {
    return null;
  }
}

// Keep persisted demo/user IDs consistent across the JSON and database stores.
export async function seedDefaultUsers(): Promise<void> {
  const users = await readUsersFromFile();
  try {
    for (const user of users) {
      if (!demoUsersEnabled && isDemoUser(user)) continue;
      const stored = await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id, name: user.name, email: user.email, password: user.password,
          role: user.role, city: user.city, language: user.language, topics: user.topics,
          interests: { create: user.interests.map((category) => ({ category })) },
        },
      });
      if (stored.id !== user.id) await reconcileUserId(user.email, stored.id);
    }
  } catch (error) {
    console.warn('[UserStore] Database synchronization unavailable:', (error as Error).message);
  }
}
