import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { Readable } from 'node:stream';
import prisma from '../db.js';
import { app } from '../index.js';
import { DATA_DIR, getJwtSecret } from '../config.js';
import { createToken, verifyToken, seedDefaultUsers } from '../services/authService.js';
import { createUserRecord, readUsersFromFile, updateUserPreferences } from '../services/userStore.js';
import { getCommunityPosts } from '../services/communityService.js';
import { publicationDateRange } from '../services/dateRange.js';
import { getMapArticles, getFallbackMapArticles } from '../services/articleService.js';
import { verifyClaimEvidence } from '../services/aiService.js';

// Prisma delegates expose methods through proxies rather than property descriptors.
function mockDb(t: any, delegate: any, method: string, implementation: (...args: any[]) => any) {
  const original = delegate[method];
  const replacement = t.mock.fn(implementation);
  delegate[method] = replacement;
  t.after(() => { delegate[method] = original; });
  return replacement;
}

function request(method: string, url: string, headers: Record<string, string> = {}, body?: unknown): Promise<{status: number; body: any}> {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(new Readable({ read() {} }) as any);
    req.method = method; req.url = url; req.headers = headers;
    if (body !== undefined) { req.headers['content-type'] = 'application/json'; req.headers['content-length'] = String(Buffer.byteLength(JSON.stringify(body))); }
    const res = new http.ServerResponse(req);
    let output = '';
    res.write = ((chunk: any) => { output += chunk.toString(); return true; }) as any;
    res.end = ((chunk?: any) => { if (chunk) output += chunk.toString(); resolve({status: res.statusCode, body: JSON.parse(output)}); return res; }) as any;
    app(req, res);
    if (body !== undefined) req.push(JSON.stringify(body));
    req.push(null);
  });
}

test('JWT rejects signed tokens without expiration or valid claims', () => {
  for (const payload of [ { sub: 'x', email: 'x@y.com', role: 'admin' }, { sub: '', email: 'x@y.com', role: 'admin', exp: Date.now() }, { sub: 'x', email: 'x@y.com', role: 'root', exp: Date.now() } ]) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${data}`).digest('base64url');
    assert.equal(verifyToken(`${header}.${data}.${signature}`), null);
  }
});

test('Bookmark routes never trust a caller-supplied user ID', async (t) => {
  const spy = mockDb(t, prisma.bookmark, 'findMany', async () => []);
  const result = await request('GET', '/api/bookmarks', { 'x-user-id': 'victim' });
  assert.equal(result.status, 200);
  assert.equal(spy.mock.callCount(), 0);
  assert.equal((await request('POST', '/api/bookmarks', { 'x-user-id': 'victim' }, { articleId: 'article-1' })).status, 401);
});

test('Signed-in bookmark reads are not broadened by a guest header', async (t) => {
  let query: any;
  mockDb(t, prisma.bookmark, 'findMany', async (args: any) => { query = args; return []; });
  const token = createToken({ id: 'user-1', email: 'a@example.com', role: 'user' });
  const result = await request('GET', '/api/bookmarks', { authorization: `Bearer ${token}`, 'x-guest-session': 'other-guest' });
  assert.equal(result.status, 200);
  assert.deepEqual(query.where.OR, [{ userId: 'user-1' }]);
});

test('Search and publication visibility both apply to community queries', async (t) => {
  let query: any;
  mockDb(t, prisma.communityPost, 'count', async () => 0);
  mockDb(t, prisma.communityPost, 'findMany', async (args: any) => { query = args; return []; });
  await getCommunityPosts({ search: 'bridge', includePendingForUser: 'author-1', status: 'pending' });
  assert.equal(query.where.OR[0].title.contains, 'bridge');
  assert.deepEqual(query.where.AND, [{ OR: [{ status: 'approved' }, { authorId: 'author-1' }] }]);
  await getCommunityPosts({ status: 'pending' });
  assert.deepEqual(query.where.AND, [{ OR: [{ status: 'approved' }] }]);
});

test('Public post detail excludes unpublished reports', async (t) => {
  mockDb(t, prisma.communityPost, 'findUnique', async () => ({ id: 'draft', status: 'pending', authorId: 'someone', _count: { reactions: 0, comments: 0 } }));
  assert.equal((await request('GET', '/api/community/draft')).status, 404);
});

test('Concurrent account creation preserves every account and rejects duplicates', async (t) => {
  mockDb(t, prisma.user, 'create', async () => ({}));
  await readUsersFromFile();
  const suffix = crypto.randomUUID();
  const users = await Promise.all(Array.from({ length: 4 }, (_, i) => createUserRecord({ name: `Concurrent ${i}`, email: `${suffix}-${i}@example.com`, passwordHash: 'test:hash' })));
  const stored = await readUsersFromFile();
  for (const user of users) assert.ok(stored.some((entry) => entry.id === user.id));
  const duplicate = { name: 'Duplicate', email: `${suffix}-duplicate@example.com`, passwordHash: 'test:hash' };
  const outcomes = await Promise.allSettled([createUserRecord(duplicate), createUserRecord(duplicate)]);
  assert.equal(outcomes.filter((entry) => entry.status === 'fulfilled').length, 1);
  mockDb(t, prisma.user, 'update', async () => ({}));
  await Promise.all([updateUserPreferences(users[0].id, { city: 'Pune' }), updateUserPreferences(users[0].id, { language: 'hi' })]);
  const updated = (await readUsersFromFile()).find((entry) => entry.id === users[0].id)!;
  assert.equal(updated.city, 'Pune');
  assert.equal(updated.language, 'hi');
});

test('Corrupt user data is reported without replacing it', async () => {
  const file = path.join(DATA_DIR, 'users.json');
  const original = await fs.readFile(file, 'utf8');
  try {
    await fs.writeFile(file, '{broken');
    await assert.rejects(readUsersFromFile(), /Unable to read user accounts/);
    assert.equal(await fs.readFile(file, 'utf8'), '{broken');
  } finally { await fs.writeFile(file, original); }
});

test('Retrieved search results alone never establish claim support', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ results: [{ title: 'Contradictory report', url: 'https://example.com/report', content: 'The proposal was rejected.' }] }));
  const previous = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = 'test-key';
  try {
    const result = await verifyClaimEvidence({ claim: 'The proposal was approved' });
    assert.equal(result.verdict, 'inconclusive');
    assert.equal(result.evidence.supporting.length, 0);
    assert.equal(result.evidence.inconclusive.length, 1);
  } finally { if (previous === undefined) delete process.env.TAVILY_API_KEY; else process.env.TAVILY_API_KEY = previous; }
});


test('Date ranges use India midnight and inclusive calendar-day boundaries', () => {
  const now = new Date('2027-01-01T00:00:00Z');
  const today = publicationDateRange('today', undefined, undefined, now)!;
  assert.equal(today.gte!.toISOString(), '2026-12-31T18:30:00.000Z');
  assert.equal(today.lt!.toISOString(), '2027-01-01T18:30:00.000Z');
  const week = publicationDateRange('7d', undefined, undefined, now)!;
  assert.equal(week.gte!.toISOString(), '2026-12-25T18:30:00.000Z');
  assert.throws(() => publicationDateRange('custom', '2027-02-30'), /Invalid date range/);
  assert.throws(() => publicationDateRange('custom', '2027-01-02', '2027-01-01'), /Invalid date range/);
});

test('Empty live map results stay empty and offline maps respect date filters', async (t) => {
  mockDb(t, prisma.article, 'count', async () => 0);
  mockDb(t, prisma.article, 'findMany', async () => []);
  assert.deepEqual((await getMapArticles({})).data, []);
  assert.deepEqual(getFallbackMapArticles({ dateRange: 'custom', startDate: '2000-01-01', endDate: '2000-01-02' }), []);
});

test('Public comment reads cannot expose an unpublished report', async (t) => {
  mockDb(t, prisma.communityPost, 'findUnique', async () => ({ id: 'draft', status: 'pending', authorId: 'someone', _count: { reactions: 0, comments: 0 } }));
  assert.equal((await request('GET', '/api/community/draft/comments')).status, 404);
});

test('Fresh sign-in gets a unique token even within the same second', () => {
  const user = { id: 'fresh-user', email: 'fresh@example.com', role: 'user' };
  assert.notEqual(createToken(user), createToken(user));
});


test('Seeding existing accounts preserves database IDs and updates local references', async (t) => {
  const users = await readUsersFromFile();
  const target = users.find((entry) => entry.email.includes('@example.com'))!;
  const databaseId = `database-${target.id}`;
  mockDb(t, prisma.user, 'upsert', async (args: any) => ({ id: args.where.email === target.email ? databaseId : args.create.id }));
  await seedDefaultUsers();
  assert.equal((await readUsersFromFile()).find((entry) => entry.email === target.email)!.id, databaseId);
});
