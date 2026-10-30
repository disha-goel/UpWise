import test from 'node:test'
import assert from 'node:assert/strict'
import { matchDatePreset } from '../utils/dateUtils.js'
import {
  fetchArticlesFromBackend, fetchCommunityPostsApi, createCommunityPostApi,
  togglePostReactionApi, addCommentApi, reportCommunityPostApi, loginApi, registerApi,
  checkClaimEvidenceApi,
} from '../services/api.js'

function browser(t: any) {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }
  const globals = globalThis as any
  const previousWindow = Object.getOwnPropertyDescriptor(globals, 'window')
  const previousStorage = Object.getOwnPropertyDescriptor(globals, 'localStorage')
  Object.defineProperty(globals, 'window', { configurable: true, value: {} })
  Object.defineProperty(globals, 'localStorage', { configurable: true, value: storage })
  t.after(() => {
    if (previousWindow) Object.defineProperty(globals, 'window', previousWindow); else delete globals.window
    if (previousStorage) Object.defineProperty(globals, 'localStorage', previousStorage); else delete globals.localStorage
  })
  return values
}

test('Date filters use India midnight and reject historic demo dates', () => {
  const now = new Date('2027-01-01T00:00:00Z')
  assert.equal(matchDatePreset('2026-10-29', 'today', undefined, undefined, now), false)
  assert.equal(matchDatePreset('2026-12-31T19:00:00Z', 'today', undefined, undefined, now), true)
  assert.equal(matchDatePreset('2026-12-31T18:29:59Z', 'yesterday', undefined, undefined, now), true)
  assert.equal(matchDatePreset('2027-01-02', 'week', undefined, undefined, now), false)
  assert.equal(matchDatePreset('2026-12-26', 'week', undefined, undefined, now), true)
  assert.equal(matchDatePreset('2026-12-25', 'week', undefined, undefined, now), false)
  assert.equal(matchDatePreset('2027-02-30', 'custom'), false)
  assert.equal(matchDatePreset('2026-12-31', 'custom', '2027-01-02', '2027-01-01'), false)
})

test('Successful empty feeds do not return cached or demo posts', async (t) => {
  browser(t)
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, data: [], pagination: { total: 0, hasMore: false } }))
  assert.deepEqual((await fetchArticlesFromBackend({})).articles, [])
  assert.deepEqual((await fetchCommunityPostsApi({})).data, [])
})

test('Rejected community submissions and comments remain errors', async (t) => {
  const values = browser(t)
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false, error: 'Authentication required' }, { status: 401 }))
  await assert.rejects(createCommunityPostApi({ title: 'Example post', description: 'A detailed community dispatch', category: 'General', disclaimerAgreed: true }), /Authentication required/)
  await assert.rejects(addCommentApi('post-1', 'Example comment'), /Authentication required/)
  assert.equal(values.has('upwise_community_posts'), false)
})

test('Network failures never fabricate community or authentication success', async (t) => {
  browser(t)
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(addCommentApi('post-1', 'Example comment'), /Unable to connect/)
  await assert.rejects(loginApi({ email: 'a@example.com', password: 'example123' }), /fetch|connect/)
  await assert.rejects(registerApi({ name: 'Example', email: 'a@example.com', password: 'example123' }), /fetch|connect/)
  assert.equal((await reportCommunityPostApi('post-1', 'Misleading')).success, false)
})

test('Vote state uses authoritative server count and per-user state', async (t) => {
  browser(t)
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, data: { upvoted: false, totalUpvotes: 42 } }))
  assert.deepEqual(await togglePostReactionApi('post-1'), { upvotes: 42, hasUpvoted: false })
})

test('Offline evidence cannot verify a negated claim through word overlap', async () => {
  const result = await checkClaimEvidenceApi({ claim: 'Council did not approve the transport project', articleContext: {
    title: 'Council approves transport project', summary: 'The council approved the transport project unanimously.',
  } })
  assert.equal(result.verdict, 'inconclusive')
  assert.equal(result.evidence.supporting.length, 0)
})
