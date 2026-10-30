import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { Readable } from 'stream';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-editorial-upwise-2026';

import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  invalidateToken,
} from '../services/authService.js';
import {
  findUserByEmail,
  findUserById,
  createUserRecord,
  sanitizeUser,
} from '../services/userStore.js';
import { app } from '../index.js';

// Helper for making in-memory HTTP requests directly to Express without network port requirements
function makeRequest(
  expressApp: any,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    try {
      const bodyStr = options.body !== undefined ? JSON.stringify(options.body) : '';
      const socket = new Readable({ read() {} });
      const req = new http.IncomingMessage(socket as any);
      req.method = options.method || 'GET';
      req.url = options.path;
      req.headers = {
        'content-type': 'application/json',
        ...(options.headers
          ? Object.fromEntries(
              Object.entries(options.headers).map(([k, v]) => [k.toLowerCase(), v])
            )
          : {}),
      };
      if (bodyStr) {
        req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
      }

      let resData = '';
      const res = new http.ServerResponse(req);
      res.write = function (chunk: any) {
        if (chunk) resData += chunk.toString();
        return true;
      };
      res.end = function (chunk?: any) {
        if (chunk) resData += chunk.toString();
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
        return res;
      };

      expressApp(req, res);
      if (bodyStr) {
        req.push(bodyStr);
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

test('Password Hashing: Salted PBKDF2 hash generation and verification', () => {
  const password = 'mySecretPassword!2026';
  const hashed = hashPassword(password);

  assert.notEqual(hashed, password, 'Password must not be stored in plaintext');
  assert.ok(hashed.includes(':'), 'Hash must contain salt delimiter');

  const [salt, hash] = hashed.split(':');
  assert.equal(salt.length, 32, 'Salt must be a 16-byte hex string (32 chars)');
  assert.ok(hash.length > 50, 'Hash must be a non-trivial hash string');

  const valid = verifyPassword(password, hashed);
  assert.equal(valid, true, 'Correct password must verify successfully');

  const invalid = verifyPassword('wrongPassword123', hashed);
  assert.equal(invalid, false, 'Incorrect password must be rejected');
});

test('JWT Signing: Cryptographic HMAC tokens and tamper detection', () => {
  const token = createToken({
    id: 'usr_test_123',
    email: 'test@upwise.news',
    role: 'user',
  });

  const verified = verifyToken(token);
  assert.ok(verified, 'Token must be verified successfully');
  assert.equal(verified?.sub, 'usr_test_123');
  assert.equal(verified?.email, 'test@upwise.news');
  assert.equal(verified?.role, 'user');

  // Tampered token test (manipulating payload)
  const parts = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ sub: 'usr_hacked', email: 'hacked@upwise.news', role: 'admin' })
  ).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

  const tamperedResult = verifyToken(tamperedToken);
  assert.equal(tamperedResult, null, 'Tampered token must be rejected');
});

test('Token Invalidation: Logout blacklist check', () => {
  const token = createToken({ id: 'usr_logout_test', email: 'logout@upwise.news', role: 'user' });
  assert.ok(verifyToken(token), 'Token is initially valid');

  invalidateToken(token);
  assert.equal(verifyToken(token), null, 'Invalidated token must be rejected');
});

test('User Store: Normalized email lookup and safe sanitization', async () => {
  const testEmail = `editor_lookup_${Date.now()}@upwise.news`;
  const created = await createUserRecord({
    name: 'Lookup Tester',
    email: testEmail.toUpperCase(), // Mixed case
    passwordHash: hashPassword('password123'),
  });

  assert.equal(created.email, testEmail.toLowerCase(), 'Email must be normalized to lowercase');
  assert.equal((created as any).password, undefined, 'Sanitized user must never expose password hash');

  const found = await findUserByEmail(testEmail);
  assert.ok(found, 'User should be found by normalized email');
  assert.equal(found?.id, created.id);
});

test('HTTP API: End-to-end Authentication Suite', async (t) => {
  const uniqueSuffix = Date.now();
  const testUser = {
    name: 'Ananya Deshmukh',
    email: `ananya_${uniqueSuffix}@upwise.news`,
    password: 'securePassword2026!',
    city: 'Pune',
    language: 'en',
    topics: ['tech-computing', 'business-markets'],
  };

  let authToken = '';

  // 1. Registration
  await t.test('POST /api/auth/register - Success with valid data', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/register',
      body: testUser,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Response must include JWT token');
    assert.equal(res.body.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.user.password, undefined, 'Password must not be returned');

    authToken = res.body.token;
  });

  // 2. Duplicate Registration Prevention
  await t.test('POST /api/auth/register - Reject duplicate email', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/register',
      body: testUser,
    });

    assert.equal(res.status, 409, 'Should return 409 Conflict for duplicate email');
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('already exists'));
  });

  // 3. Registration Validation
  await t.test('POST /api/auth/register - Reject invalid email or short password', async () => {
    const invalidEmailRes = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Test', email: 'not-an-email', password: 'password123' },
    });
    assert.equal(invalidEmailRes.status, 400);

    const shortPassRes = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Test', email: 'test_short@upwise.news', password: '123' },
    });
    assert.equal(shortPassRes.status, 400);
  });

  // 4. Login Success
  await t.test('POST /api/auth/login - Success with correct credentials', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.user.password, undefined);
  });

  // 5. Login Failure (Wrong password)
  await t.test('POST /api/auth/login - 401 on wrong password', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testUser.email,
        password: 'incorrectPassword',
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Invalid email or password');
  });

  // 6. Pre-seeded Demo Account Login
  await t.test('POST /api/auth/login - Works with pre-seeded demo editor account', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'editor@upwise.news',
        password: 'password123',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'reviewer');
  });

  // 7. GET /api/auth/me - Protected route access with valid Bearer token
  await t.test('GET /api/auth/me - Success with valid token', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      path: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testUser.email.toLowerCase());
  });

  // 8. GET /api/auth/me - 401 Unauthorized without token
  await t.test('GET /api/auth/me - 401 without Bearer token', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      path: '/api/auth/me',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 9. Protected Preferences Route
  await t.test('PUT /api/users/me/preferences - Updates preferences for authenticated user', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      path: '/api/users/me/preferences',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: {
        city: 'Mumbai',
        language: 'hi',
        topics: ['sports'],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.preferences.city, 'Mumbai');
    assert.equal(res.body.preferences.language, 'hi');
  });

  // 10. POST /api/auth/logout - Invalidate token
  await t.test('POST /api/auth/logout - Invalidates session token', async () => {
    const logoutRes = await makeRequest(app, {
      method: 'POST',
      path: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Subsequent access with invalidated token must now return 401
    const meRes = await makeRequest(app, {
      method: 'GET',
      path: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(meRes.status, 401, 'Logged out token must be rejected with 401');
  });

  // 11. POST /api/ai/evidence-lens - Dedicated claim evidence retrieval
  await t.test('POST /api/ai/evidence-lens - Transparent evidence evaluation', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/ai/evidence-lens',
      body: {
        claim: 'New orbital launch vehicle clears static fire test',
        articleContext: {
          title: 'New orbital launch vehicle clears static fire test',
          publisher: 'NASA Releases',
          summary: 'The propulsion stage completed a full-duration 180-second static fire test at the test stand.',
          category: 'Technology & Science',
        },
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.verdict, 'inconclusive');
    assert.equal(res.body.evidence.supporting.length, 0);
    assert.ok(res.body.evidence.inconclusive.length > 0);
    assert.ok(res.body.aiInterpretation);
    assert.ok(res.body.sources.length > 0);
  });
});
