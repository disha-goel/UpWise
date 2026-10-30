import test, { mock } from 'node:test'

// The date fixtures intentionally describe this fixed India calendar day.
test.before(() => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-29T06:00:00Z') }))
test.after(() => mock.timers.reset())
import assert from 'node:assert/strict'

import { matchDatePreset, formatPublicationDate } from '../utils/dateUtils.js'
import { NEWS_ARTICLES } from '../data/newsData.js'
import { SEED_COMMUNITY_POSTS, COMMUNITY_CATEGORIES } from '../data/communityData.js'
import { generateSimulatedAiResponse } from '../data/aiAssistantData.js'
import {
  fetchArticlesFromBackend,
  loginApi,
  registerApi,
  fetchArticlesByLocation,
  fetchMapArticles,
  mapBackendArticleToFrontend,
  checkClaimEvidenceApi,
} from '../services/api.js'
import { SUPPORTED_LOCATIONS, searchLocations, getLocationById } from '../data/newsLocations.js'

test('Date Filtering: Today matches correctly', () => {
  const isMatch = matchDatePreset('2026-10-29', 'today')
  assert.equal(isMatch, true, '2026-10-29 should match today')

  const isOldMatch = matchDatePreset('2026-10-20', 'today')
  assert.equal(isOldMatch, false, '2026-10-20 should not match today')
})

test('Date Filtering: Yesterday matches correctly', () => {
  const isMatch = matchDatePreset('2026-10-28', 'yesterday')
  assert.equal(isMatch, true, '2026-10-28 should match yesterday')

  const isOldMatch = matchDatePreset('2026-10-15', 'yesterday')
  assert.equal(isOldMatch, false, '2026-10-15 should not match yesterday')
})

test('Date Filtering: Past 7 days (week) matches correctly', () => {
  assert.equal(matchDatePreset('2026-10-29', 'week'), true, 'Today should be in past 7 days')
  assert.equal(matchDatePreset('2026-10-25', 'week'), true, '4 days ago should be in past 7 days')
  assert.equal(matchDatePreset('2026-10-10', 'week'), false, '19 days ago should not be in past 7 days')
})

test('Date Filtering: Past 30 days matches correctly', () => {
  assert.equal(matchDatePreset('2026-10-29', 'month'), true, 'Oct 29 should be in this month')
  assert.equal(matchDatePreset('2026-10-08', 'month'), true, 'Oct 08 should be in this month')
  assert.equal(matchDatePreset('2026-08-15', 'month'), false, 'August should not be in October')
})

test('Date Filtering: Custom range boundary testing', () => {
  assert.equal(
    matchDatePreset('2026-10-25', 'custom', '2026-10-24', '2026-10-26'),
    true,
    '2026-10-25 should be inside range'
  )
  assert.equal(
    matchDatePreset('2026-10-24', 'custom', '2026-10-24', '2026-10-26'),
    true,
    'Inclusive lower boundary should match'
  )
  assert.equal(
    matchDatePreset('2026-10-26', 'custom', '2026-10-24', '2026-10-26'),
    true,
    'Inclusive upper boundary should match'
  )
  assert.equal(
    matchDatePreset('2026-10-27', 'custom', '2026-10-24', '2026-10-26'),
    false,
    'Out of bounds should fail'
  )
})

test('Date Filtering: Safe handling of invalid / missing timestamps', () => {
  assert.equal(matchDatePreset(null, 'today'), false, 'null timestamp should not match specific preset')
  assert.equal(matchDatePreset(undefined, 'today'), false, 'undefined timestamp should not match specific preset')
  assert.equal(matchDatePreset('invalid-date-string', 'today'), false, 'malformed date should safely return false')
  assert.equal(matchDatePreset(null, 'all'), true, 'null date with "all" preset should return true')
})

test('Date Formatting: Produces consistent human-readable date', () => {
  const formatted = formatPublicationDate('2026-10-29')
  assert.equal(formatted.includes('Oct') && formatted.includes('29'), true, 'Should format to Oct 29')
  assert.equal(formatPublicationDate(null), 'Recent', 'Null date returns Recent')
})

test('Dataset Integrity: Articles cover key categories and languages', () => {
  assert.ok(NEWS_ARTICLES.length >= 10, 'Should have comprehensive set of articles')

  const categories = new Set(NEWS_ARTICLES.map((a) => a.categoryId))
  assert.ok(categories.has('india-politics'), 'Contains India & Politics')
  assert.ok(categories.has('tech-science'), 'Contains Tech & Science')
  assert.ok(categories.has('business-economy'), 'Contains Business & Economy')
  assert.ok(categories.has('sports'), 'Contains Sports')
  assert.ok(categories.has('world-lifestyle'), 'Contains World & Lifestyle')

  // Verify Hindi support
  const withHindi = NEWS_ARTICLES.filter((a) => Boolean(a.titleHi && a.summaryHi))
  assert.equal(withHindi.length, NEWS_ARTICLES.length, 'All articles should have Hindi translations')
})

test('Service Adapter: fetchArticlesFromBackend filters by category and search', async () => {
  const techRes = await fetchArticlesFromBackend({ category: 'tech-science' })
  assert.ok(techRes.articles.length > 0, 'Returns tech articles')
  techRes.articles.forEach((a) => {
    assert.equal(a.categoryId, 'tech-science', 'All returned articles belong to tech-science')
  })

  const searchRes = await fetchArticlesFromBackend({ q: 'semiconductor' })
  assert.ok(searchRes.articles.length > 0, 'Finds articles matching semiconductor')

  const emptyRes = await fetchArticlesFromBackend({ q: 'nonexistentkeywordxyz123' })
  assert.equal(emptyRes.articles.length, 0, 'Non-existent search returns empty array')
  assert.equal(emptyRes.total, 0)
})

test('AI Assistant: Demo mode labeling and context-aware simulated response', () => {
  const leadArticle = NEWS_ARTICLES[0]
  const examResponse = generateSimulatedAiResponse('Explain this for UPSC exams', leadArticle)
  assert.equal(examResponse.isDemo, true, 'isDemo flag must be true')
  assert.ok(examResponse.modelName.includes('Simulated Preview'), 'Model name must state Simulated Preview')
  assert.ok(examResponse.reply.includes('Exam Context'), 'Reply must contextualize for exams')

  const policyResponse = generateSimulatedAiResponse('What is the policy impact?', leadArticle)
  assert.ok(policyResponse.reply.includes('Policy'), 'Reply must contextualize for policy')
})

test('Community Section: Data structure and category coverage', () => {
  assert.ok(SEED_COMMUNITY_POSTS.length >= 3, 'Seed community posts exist')
  assert.ok(COMMUNITY_CATEGORIES.length >= 4, 'Community categories exist')

  SEED_COMMUNITY_POSTS.forEach((p) => {
    assert.ok(p.id, 'Post has id')
    assert.ok(p.title, 'Post has title')
    assert.ok(p.content, 'Post has content')
    assert.ok(p.authorName, 'Post has authorName')
    assert.ok(Array.isArray(p.comments), 'Post comments is an array')
  })
})

test('Client-Side Auth: Maps successful server authentication responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const payload = JSON.parse(init.body as string)
    return Response.json({ success: true, token: 'server-signed-token', user: {
      id: 'test-user', name: payload.name || 'Editor', email: payload.email, role: 'user',
    } })
  })
  const loginRes = await loginApi({ email: 'editorial@upwise.hub', password: 'password123' })
  assert.ok(loginRes.token, 'Generates simulated token')
  assert.equal(loginRes.user.email, 'editorial@upwise.hub')
  assert.ok(loginRes.user.initials)

  const regRes = await registerApi({ name: 'Neha Sharma', email: 'neha@example.com', password: 'secretpassword' })
  assert.equal(regRes.user.name, 'Neha Sharma')
  assert.equal(regRes.user.initials, 'NS')
})

test('News Locations Taxonomy: Comprehensive coverage and search autocomplete', () => {
  const ids = SUPPORTED_LOCATIONS.map((l) => l.id)
  assert.ok(ids.includes('punjab'), 'Contains Punjab desk')
  assert.ok(ids.includes('haryana'), 'Contains Haryana desk')
  assert.ok(ids.includes('delhi'), 'Contains Delhi NCR desk')
  assert.ok(ids.includes('chandigarh'), 'Contains Chandigarh desk')
  assert.ok(ids.includes('karnataka'), 'Contains Karnataka desk')
  assert.ok(ids.includes('maharashtra'), 'Contains Maharashtra desk')
  assert.ok(ids.includes('united-states'), 'Contains US bureau')
  assert.ok(ids.includes('united-kingdom'), 'Contains UK bureau')
  assert.ok(ids.includes('switzerland'), 'Contains Switzerland bureau')
  assert.ok(ids.includes('global'), 'Contains Global bureau')

  // Search autocomplete
  const punjabSearch = searchLocations('pun')
  assert.ok(punjabSearch.some((l) => l.id === 'punjab'), 'Finds Punjab by prefix')

  const bangaloreSearch = searchLocations('bengaluru')
  assert.ok(bangaloreSearch.some((l) => l.id === 'karnataka'), 'Finds Karnataka via Bengaluru alias')

  const chdSearch = searchLocations('chandigarh')
  assert.ok(chdSearch.some((l) => l.id === 'chandigarh'), 'Finds Chandigarh')

  // Direct lookup
  const loc = getLocationById('haryana')
  assert.equal(loc?.name, 'Haryana')
  assert.equal(loc?.mapView, 'india')
})

test('Geographic News Filtering: fetchArticlesByLocation returns prioritized local stories', async () => {
  // Test Punjab
  const punjabRes = await fetchArticlesByLocation({ locationId: 'punjab' })
  assert.ok(punjabRes.articles.length > 0, 'Returns articles for Punjab')
  assert.ok(punjabRes.leadArticle, 'Identifies a lead story for Punjab')
  assert.ok(
    punjabRes.articles.some((a) => a.location?.state === 'Punjab' || a.content.includes('Punjab')),
    'Stories relate directly to Punjab'
  )

  // Test Chandigarh
  const chdRes = await fetchArticlesByLocation({ locationId: 'chandigarh' })
  assert.ok(chdRes.articles.length > 0, 'Returns articles for Chandigarh')
  assert.ok(
    chdRes.articles.some((a) => a.location?.city === 'Chandigarh' || a.title.includes('Chandigarh') || a.title.includes('PGIMER')),
    'Stories relate directly to Chandigarh'
  )

  // Test Haryana
  const haryanaRes = await fetchArticlesByLocation({ locationId: 'haryana' })
  assert.ok(haryanaRes.articles.length > 0, 'Returns articles for Haryana')
  assert.ok(
    haryanaRes.articles.some((a) => a.location?.state === 'Haryana' || a.content.includes('Haryana')),
    'Stories relate directly to Haryana'
  )

  // Test Category and Date filtering on location
  const filteredRes = await fetchArticlesByLocation({
    locationId: 'punjab',
    category: 'tech-science',
  })
  assert.ok(filteredRes.articles.every((a) => a.categoryId === 'tech-science'), 'Respects category filter within location')
})

test('Backend Adapter: mapBackendArticleToFrontend maps fields, clusters, and preserves Hindi', () => {
  const backendMock = {
    id: 'back-123',
    title: 'वैज्ञानिकों ने क्वांटम कंप्यूटिंग में नया रिकॉर्ड बनाया',
    summary: 'शोधकर्ताओं ने 1000 क्वैबिट सिस्टम पर शून्य त्रुटि दर हासिल की।',
    content: 'विस्तृत समाचार सामग्री यहाँ दी गई है।\n\nदूसरा पैराग्राफ यहाँ है।',
    url: 'https://example.com/quantum',
    publisher: 'अमर उजाला',
    category: 'Technology & Science',
    subcategory: 'AI and technology',
    publishedAt: '2026-10-29T10:00:00.000Z',
    readingTime: 4,
    language: 'hi',
    clusters: [
      {
        cluster: {
          id: 'clust-1',
          canonicalTitle: 'Breakthrough in Quantum Computing',
          members: [
            { id: 'm1', article: { id: 'back-123', title: 'Article 1', publisher: 'अमर उजाला', url: 'https://a.com' } },
            { id: 'm2', article: { id: 'm2', title: 'Quantum Milestone Reached', publisher: 'The Verge', url: 'https://b.com' } }
          ]
        }
      }
    ]
  }

  const mapped = mapBackendArticleToFrontend(backendMock)
  assert.equal(mapped.id, 'back-123')
  assert.equal(mapped.categoryId, 'tech-science')
  assert.equal(mapped.categoryName, 'Technology & Science')
  assert.equal(mapped.titleHi, backendMock.title)
  assert.equal(mapped.summaryHi, backendMock.summary)
  assert.equal(mapped.readTime, '4 min read')
  assert.equal(mapped.source.name, 'अमर उजाला')
  assert.equal(mapped.originalUrl, 'https://example.com/quantum')
  assert.equal(mapped.content.length, 2)
  assert.ok(mapped.cluster, 'Maps cluster when members > 1')
  assert.equal(mapped.cluster?.sourceCount, 2)
  assert.equal(mapped.cluster?.members[1].publisher, 'The Verge')
})

test('Evidence Lens: Evaluates claims without fabricating external sources when offline', async () => {
  const result = await checkClaimEvidenceApi({
    claim: 'Semiconductor consortium plans pilot wafer fab in Gujarat',
    articleContext: {
      title: 'Semiconductor consortium plans pilot wafer fab in Gujarat',
      publisher: 'The Hindu',
      summary: 'A multi-state semiconductor consortium has commenced construction on a 300mm wafer fabrication facility in Gujarat.',
      category: 'tech-science',
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.searchAvailable, false)
  assert.equal(result.verdict, 'inconclusive')
  assert.equal(result.evidence.supporting.length, 0, 'Word overlap cannot verify a claim')
  assert.ok(result.evidence.inconclusive.length > 0)
  assert.equal(result.evidence.contradicting.length, 0)
  assert.ok(result.sources.length > 0)
  assert.ok(result.sources[0].title.includes('The Hindu'))
  assert.ok(result.aiInterpretation.includes('No external sources were fabricated'))
})

test('Satellite Map Service: fetchMapArticles returns articles with verified real coordinates', async () => {
  const res = await fetchMapArticles({})
  assert.ok(res.articles.length > 0, 'Returns articles for map display')
  res.articles.forEach((a) => {
    assert.ok(a.location, 'Article has location object')
    assert.ok(Array.isArray(a.location?.coordinates), 'Article has coordinates array')
    assert.equal(a.location?.coordinates?.length, 2, 'Coordinates has [lat, lng]')
    const [lat, lng] = a.location!.coordinates!
    assert.ok(!isNaN(lat) && !isNaN(lng), 'Coordinates are valid numbers')
  })
})

test('Satellite Map Service: Bounding box filtering works accurately', async () => {
  const indiaRes = await fetchMapArticles({
    bbox: [68, 6, 97, 37],
  })
  assert.ok(indiaRes.articles.length > 0, 'Finds articles inside India bounding box')
  indiaRes.articles.forEach((a) => {
    const [lat, lng] = a.location!.coordinates!
    assert.ok(lat >= 6 && lat <= 37 && lng >= 68 && lng <= 97, 'Article coordinates inside India bbox')
  })
})

test('Satellite Map Service: Combined Topic + Location search queries', async () => {
  const aiRes = await fetchMapArticles({ q: 'AI in Bengaluru' })
  assert.ok(aiRes.articles.length > 0, 'Finds AI news in Bengaluru')
  assert.ok(aiRes.articles.some((a) => a.location?.city === 'Bengaluru'))

  const punjabRes = await fetchMapArticles({ q: 'Elections in Punjab' })
  assert.ok(punjabRes.articles.length > 0, 'Finds dispatches related to Punjab')

  const cricketRes = await fetchMapArticles({ q: 'Cricket in Mumbai' })
  assert.ok(cricketRes.articles.length > 0, 'Finds news related to Mumbai')
})

test('Satellite Map Service: Filters work cohesively together', async () => {
  const filtered = await fetchMapArticles({
    locationId: 'punjab',
    category: 'tech-science',
    language: 'all',
  })
  assert.ok(Array.isArray(filtered.articles))
  filtered.articles.forEach((a) => {
    assert.equal(a.categoryId, 'tech-science', 'Category filter applies')
  })
})
