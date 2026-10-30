/**
 * Upwise Hub - Frontend Data Layer & Service Adapter
 * 
 * Cleanly decouples UI components from backend requirements.
 * Operates independently using structured frontend datasets and browser localStorage,
 * with isolated extension points for future backend API integration.
 */

import { Article, LanguageMode } from '../types/news'
import { UserProfile } from '../types/navigation'
import { NEWS_ARTICLES } from '../data/newsData'
import { SEED_COMMUNITY_POSTS, CommunityPost, CommunityComment } from '../data/communityData'
import { generateSimulatedAiResponse } from '../data/aiAssistantData'
import { matchDatePreset } from '../utils/dateUtils'
import { SUPPORTED_LOCATIONS, LocationDefinition, getLocationById } from '../data/newsLocations'

// Key definitions for localStorage persistence
const STORAGE_KEYS = {
  SAVED_ARTICLES: 'upwise_saved_articles',
  COMMUNITY_POSTS: 'upwise_community_posts',
  USER_SESSION: 'upwise_user_session',
  USER_PREFERENCES: 'upwise_user_preferences',
  GUEST_SESSION: 'upwise_guest_session',
  AUTH_TOKEN: 'upwise_auth_token',
}

// ----------------------------------------------------------------------
// Auth & Session Utilities (Client-Side Only)
// ----------------------------------------------------------------------

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    }
  } catch {
    // Storage fallback
  }
}

let transientGuestSession: string | undefined

export function getGuestSessionId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.GUEST_SESSION)
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now()
      localStorage.setItem(STORAGE_KEYS.GUEST_SESSION, id)
    }
    return id
  } catch {
    transientGuestSession ||= `guest_${globalThis.crypto.randomUUID()}`
    return transientGuestSession
  }
}

// ----------------------------------------------------------------------
// News Articles Service (Frontend Data Engine)
// ----------------------------------------------------------------------

export interface FetchArticlesParams {
  category?: string | null
  subcategory?: string | null
  subcategoryId?: string | null
  q?: string
  source?: string
  dateRange?: string
  startDate?: string
  endDate?: string
  sort?: string
  page?: number
  limit?: number
  language?: LanguageMode | string
  personalized?: boolean
}

export const CATEGORY_MAP: Record<string, { id: string; name: string }> = {
  'india-politics': { id: 'india-politics', name: 'India & Politics' },
  'india & politics': { id: 'india-politics', name: 'India & Politics' },
  'tech-science': { id: 'tech-science', name: 'Technology & Science' },
  'technology & science': { id: 'tech-science', name: 'Technology & Science' },
  'technology-science': { id: 'tech-science', name: 'Technology & Science' },
  'business-economy': { id: 'business-economy', name: 'Business & Economy' },
  'business & economy': { id: 'business-economy', name: 'Business & Economy' },
  'sports': { id: 'sports', name: 'Sports' },
  'world-lifestyle': { id: 'world-lifestyle', name: 'World & Lifestyle' },
  'world & lifestyle': { id: 'world-lifestyle', name: 'World & Lifestyle' },
}

export function mapBackendArticleToFrontend(item: any): Article {
  // If item is already formatted as a frontend Article (e.g. from local dataset fallback)
  if (item.source && typeof item.source === 'object' && item.categoryId && item.categoryName) {
    return item as Article
  }

  const rawCat = (item.category || '').toLowerCase().trim()
  const mappedCat = CATEGORY_MAP[rawCat] || {
    id: rawCat.replace(/[\s&]+/g, '-'),
    name: item.category || 'General',
  }

  const isHindi = item.language === 'hi' || /[\u0900-\u097F]/.test(item.title || '')

  // Format published date
  const pubDateStr = item.publishedAt
    ? typeof item.publishedAt === 'string'
      ? item.publishedAt
      : new Date(item.publishedAt).toISOString()
    : new Date().toISOString().slice(0, 10)

  // Map real cluster data if present and verified across >1 sources
  let cluster: Article['cluster'] = undefined
  if (Array.isArray(item.clusters) && item.clusters.length > 0) {
    const clusterObj = item.clusters[0]?.cluster
    if (clusterObj && Array.isArray(clusterObj.members) && clusterObj.members.length > 1) {
      cluster = {
        id: clusterObj.id,
        canonicalTitle: clusterObj.canonicalTitle || item.title,
        sourceCount: clusterObj.members.length,
        members: clusterObj.members.map((m: any) => ({
          id: m.article?.id || m.id,
          title: m.article?.title || m.title,
          publisher: m.article?.publisher || m.publisher || 'Verified Newsroom',
          url: m.article?.url || m.url || '#',
          publishedAt: m.article?.publishedAt || m.publishedAt,
          imageUrl: m.article?.imageUrl || m.imageUrl,
        })),
      }
    }
  }

  // Parse content paragraphs safely
  let contentArr: string[] = []
  if (Array.isArray(item.content)) {
    contentArr = item.content
  } else if (typeof item.content === 'string' && item.content.trim()) {
    contentArr = item.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
  }
  if (contentArr.length === 0 && item.summary) {
    contentArr = [item.summary]
  }

  const readingTime = item.readingTime
    ? `${item.readingTime} min read`
    : `${Math.max(1, Math.ceil((item.summary || '').split(/\s+/).length / 60))} min read`

  return {
    id: String(item.id),
    title: item.title,
    titleHi: isHindi ? item.title : item.titleHi,
    deck: item.summary ? item.summary.slice(0, 140) + '...' : undefined,
    deckHi: isHindi ? (item.summary ? item.summary.slice(0, 140) + '...' : undefined) : item.deckHi,
    summary: item.summary,
    summaryHi: isHindi ? item.summary : item.summaryHi,
    content: contentArr,
    contentHi: isHindi ? contentArr : item.contentHi,
    keyTakeaways: Array.isArray(item.keyTakeaways) ? item.keyTakeaways : undefined,
    keyTakeawaysHi: isHindi && Array.isArray(item.keyTakeaways) ? item.keyTakeaways : item.keyTakeawaysHi,
    categoryId: mappedCat.id,
    categoryName: mappedCat.name,
    subcategoryId: item.subcategory,
    subcategoryName: item.subcategory,
    source: {
      name: item.publisher || 'Upwise Wire',
      verified: true,
      url: item.url,
    },
    author: {
      name: item.author || item.publisher || 'Editorial Staff',
      role: 'Staff Reporter',
    },
    publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : new Date(item.publishedAt || Date.now()).toISOString(),
    publishedDate: pubDateStr,
    readTime: readingTime,
    imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
    imageCaption: item.publisher ? `Reported by ${item.publisher}` : undefined,
    originalUrl: item.url || '#',
    isLead: Boolean(item.isLead),
    isTrending: Boolean(item.trending),
    location: (item.location && typeof item.location === 'object')
      ? item.location
      : (item.latitude != null && item.longitude != null)
      ? {
          country: item.country || 'India',
          city: item.city || undefined,
          state: item.state || undefined,
          region: item.state || item.city,
          coordinates: [item.latitude, item.longitude],
          locationType: 'about',
        }
      : undefined,
    cluster,
  }
}

export async function fetchArticlesFromBackend(
  params: FetchArticlesParams
): Promise<{ articles: Article[]; total: number; hasMore: boolean }> {
  // 1. Try real backend request when in browser environment
  if (typeof window !== 'undefined') {
    try {
      const qParams = new URLSearchParams()
      if (params.category && params.category !== 'all' && params.category !== 'All') {
        const catInfo = CATEGORY_MAP[params.category.toLowerCase()]
        qParams.set('category', catInfo ? catInfo.name : params.category)
      }
      const subcat = params.subcategoryId || params.subcategory
      if (subcat && subcat !== 'all' && subcat !== 'All') {
        qParams.set('subcategory', subcat)
      }
      if (params.q && params.q.trim()) {
        qParams.set('q', params.q.trim())
      }
      if (params.source && params.source !== 'All') {
        qParams.set('source', params.source)
      }
      if (params.dateRange && params.dateRange !== 'all') {
        const dateMapping: Record<string, string> = {
          today: 'today',
          yesterday: 'yesterday',
          week: '7d',
          month: '30d',
          custom: 'custom',
        }
        qParams.set('dateRange', dateMapping[params.dateRange] || params.dateRange)
      }
      if (params.startDate) qParams.set('startDate', params.startDate)
      if (params.endDate) qParams.set('endDate', params.endDate)
      if (params.sort) qParams.set('sort', params.sort)
      if (params.page) qParams.set('page', String(params.page))
      if (params.limit) qParams.set('limit', String(params.limit))
      if (params.language && (params.language as string) !== 'all') qParams.set('language', params.language)
      if (params.personalized) qParams.set('personalized', 'true')

      const res = await fetch(`/api/articles?${qParams.toString()}`, {
        headers: defaultHeaders(),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const mappedArticles = json.data.map(mapBackendArticleToFrontend)
          return {
            articles: mappedArticles,
            total: json.pagination?.total || mappedArticles.length,
            hasMore: Boolean(json.pagination?.hasMore),
          }
        }
      }
    } catch {
      // Backend not reached or offline; gracefully proceed to local fallback
    }
  }

  // 2. Graceful fallback to NEWS_ARTICLES
  await new Promise((resolve) => setTimeout(resolve, 60))

  let filtered = [...NEWS_ARTICLES]

  // Category Filter
  if (params.category && params.category !== 'all' && params.category !== 'All') {
    filtered = filtered.filter(
      (a) => a.categoryId.toLowerCase() === params.category?.toLowerCase()
    )
  }

  // Subcategory Filter
  if (params.subcategory && params.subcategory !== 'all' && params.subcategory !== 'All') {
    filtered = filtered.filter(
      (a) => a.subcategoryId?.toLowerCase() === params.subcategory?.toLowerCase()
    )
  }

  // Search Query
  if (params.q && params.q.trim()) {
    const q = params.q.trim().toLowerCase()
    filtered = filtered.filter((a) => {
      const matchTitle = a.title.toLowerCase().includes(q)
      const matchTitleHi = a.titleHi?.toLowerCase().includes(q)
      const matchDeck = a.deck?.toLowerCase().includes(q)
      const matchSummary = a.summary.toLowerCase().includes(q)
      const matchPublisher = a.source.name.toLowerCase().includes(q)
      const matchContent = Array.isArray(a.content) && a.content.some((c) => c.toLowerCase().includes(q))
      const matchTakeaways = Array.isArray(a.keyTakeaways) && a.keyTakeaways.some((t) => t.toLowerCase().includes(q))
      const matchLocation = a.location && (
        a.location.country.toLowerCase().includes(q) ||
        (a.location.state && a.location.state.toLowerCase().includes(q)) ||
        (a.location.city && a.location.city.toLowerCase().includes(q))
      )
      return (
        matchTitle ||
        matchTitleHi ||
        matchDeck ||
        matchSummary ||
        matchPublisher ||
        matchContent ||
        matchTakeaways ||
        matchLocation
      )
    })
  }

  // Source / Publisher Filter
  if (params.source && params.source !== 'All') {
    filtered = filtered.filter((a) => a.source.name === params.source)
  }

  // Date Range Filter
  if (params.dateRange && params.dateRange !== 'all') {
    filtered = filtered.filter((a) =>
      matchDatePreset(
        a.publishedDate || a.publishedAt,
        params.dateRange as any,
        params.startDate,
        params.endDate
      )
    )
  }

  // Sorting
  if (params.sort === 'oldest') {
    filtered.sort((a, b) => (a.publishedDate > b.publishedDate ? 1 : -1))
  } else {
    // Default latest
    filtered.sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1))
  }

  // Pagination
  const page = Math.max(1, params.page || 1)
  const limit = Math.max(1, params.limit || 16)
  const startIndex = (page - 1) * limit
  const paginatedArticles = filtered.slice(startIndex, startIndex + limit)

  return {
    articles: paginatedArticles,
    total: filtered.length,
    hasMore: startIndex + limit < filtered.length,
  }
}

// ----------------------------------------------------------------------
// Geographic News Service (News Globe / Explore by Location)
// ----------------------------------------------------------------------

export interface FetchLocationNewsParams {
  locationId: string
  category?: string
  dateRange?: string
  startDate?: string
  endDate?: string
  sort?: 'latest' | 'oldest' | 'relevant'
  page?: number
  limit?: number
}

export async function fetchArticlesByLocation(
  params: FetchLocationNewsParams
): Promise<{
  articles: Article[]
  leadArticle?: Article
  total: number
  location: LocationDefinition
}> {
  // Brief delay to provide realistic async feel
  await new Promise((resolve) => setTimeout(resolve, 80))

  const location = getLocationById(params.locationId)
  let pool = [...NEWS_ARTICLES]

  // If connected to a running backend, we attempt to query location keyword as an additional signal
  try {
    if (location.id !== 'global' && typeof window !== 'undefined') {
      const res = await fetch(`/api/articles?q=${encodeURIComponent(location.name)}&limit=20`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const backendMapped = json.data.map(mapBackendArticleToFrontend)
          const existingIds = new Set(pool.map((a) => a.id))
          for (const item of backendMapped) {
            if (!existingIds.has(item.id)) {
              pool.push(item)
            }
          }
        }
      }
    }
  } catch {
    // Non-blocking fallback to local dataset
  }

  // Calculate geographic relevance score for each article
  const scored = pool
    .map((article) => {
      let score = 0
      let matchReason = ''

      if (location.id === 'global') {
        // Global overview includes all stories, prioritizing international / world treaties
        score = article.categoryId === 'world-lifestyle' ? 80 : 50
        matchReason = 'Global Wire'
      } else {
        const loc = article.location
        const aliases = location.aliases.map((a) => a.toLowerCase())

        // 1. Direct state or city match
        if (loc) {
          if (location.state && loc.state && loc.state.toLowerCase() === location.state.toLowerCase()) {
            score += loc.locationType === 'about' ? 100 : 70
            matchReason = `Direct State Dispatch (${loc.state})`
          } else if (location.city && loc.city && loc.city.toLowerCase() === location.city.toLowerCase()) {
            score += loc.locationType === 'about' ? 100 : 70
            matchReason = `Direct City Dispatch (${loc.city})`
          } else if (location.type === 'country' && loc.country && loc.country.toLowerCase() === location.country.toLowerCase()) {
            score += 60
            matchReason = `Country Bureau (${loc.country})`
          }
        }

        // 2. Dateline / content match in text
        const textToSearch = `${article.title} ${article.deck || ''} ${article.summary} ${(article.content || []).join(' ')}`.toLowerCase()
        const matchedAlias = aliases.find((alias) => textToSearch.includes(alias))

        if (matchedAlias) {
          score += 40
          if (!matchReason) {
            matchReason = `Regional Telemetry Reference (${matchedAlias})`
          }
        }

        // 3. Image caption location
        if (article.imageCaption && aliases.some((a) => article.imageCaption?.toLowerCase().includes(a))) {
          score += 20
        }
      }

      return { article, score, matchReason }
    })
    .filter((item) => (location.id === 'global' ? true : item.score > 0))

  // Sort by geographic relevance, then date
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.article.publishedDate || '') > (a.article.publishedDate || '') ? 1 : -1
  })

  let finalArticles = scored.map((item) => item.article)

  // Category filter
  if (params.category && params.category !== 'all' && params.category !== 'All') {
    finalArticles = finalArticles.filter(
      (a) => a.categoryId.toLowerCase() === params.category?.toLowerCase()
    )
  }

  // Date range filter
  if (params.dateRange && params.dateRange !== 'all') {
    finalArticles = finalArticles.filter((a) =>
      matchDatePreset(
        a.publishedDate || a.publishedAt,
        params.dateRange as any,
        params.startDate,
        params.endDate
      )
    )
  }

  const leadArticle = finalArticles.length > 0 ? finalArticles[0] : undefined
  const secondaryArticles = finalArticles.slice(1)

  return {
    articles: finalArticles,
    leadArticle,
    total: finalArticles.length,
    location,
  }
}

// ----------------------------------------------------------------------
// Geographic Interactive Satellite Map Service
// ----------------------------------------------------------------------

export interface FetchMapArticlesParams {
  bbox?: [number, number, number, number] // [minLng, minLat, maxLng, maxLat]
  locationId?: string
  location?: string
  q?: string
  category?: string
  language?: LanguageMode | string
  dateRange?: string
  startDate?: string
  endDate?: string
  sort?: 'latest' | 'oldest' | 'relevant'
  limit?: number
}

export async function fetchMapArticles(
  params: FetchMapArticlesParams
): Promise<{
  articles: Article[]
  total: number
  centerLocation?: {
    name: string
    latitude: number
    longitude: number
  }
  queryMeta?: {
    topic?: string
    location?: string
  }
}> {
  // 1. Try real backend request if in browser environment
  if (typeof window !== 'undefined') {
    try {
      const qParams = new URLSearchParams()
      if (params.bbox) qParams.set('bbox', params.bbox.join(','))
      if (params.locationId && params.locationId !== 'all' && params.locationId !== 'global') {
        qParams.set('location', params.locationId)
      } else if (params.location && params.location !== 'all' && params.location !== 'global') {
        qParams.set('location', params.location)
      }
      if (params.q && params.q.trim()) qParams.set('q', params.q.trim())
      if (params.category && params.category !== 'all' && params.category !== 'All') {
        const catInfo = CATEGORY_MAP[params.category.toLowerCase()]
        qParams.set('category', catInfo ? catInfo.name : params.category)
      }
      if (params.language && params.language !== 'all') qParams.set('language', params.language)
      if (params.dateRange && params.dateRange !== 'all') {
        const dateMapping: Record<string, string> = {
          today: 'today',
          yesterday: 'yesterday',
          week: '7d',
          month: '30d',
          custom: 'custom',
        }
        qParams.set('dateRange', dateMapping[params.dateRange] || params.dateRange)
      }
      if (params.startDate) qParams.set('startDate', params.startDate)
      if (params.endDate) qParams.set('endDate', params.endDate)
      if (params.sort) qParams.set('sort', params.sort)
      if (params.limit) qParams.set('limit', String(params.limit))

      const res = await fetch(`/api/articles/map?${qParams.toString()}`, {
        headers: defaultHeaders(),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const mappedArticles = json.data.map(mapBackendArticleToFrontend)
          return {
            articles: mappedArticles,
            total: json.total || mappedArticles.length,
            centerLocation: json.centerLocation,
            queryMeta: json.queryMeta,
          }
        }
      }
    } catch {
      // Backend not reached or offline; fall through to local dataset fallback
    }
  }

  // 2. Client-side fallback engine using NEWS_ARTICLES
  await new Promise((resolve) => setTimeout(resolve, 50))

  let pool = [...NEWS_ARTICLES].filter((a) => a.location && a.location.coordinates)

  // Bounding box filter
  if (params.bbox) {
    const [minLng, minLat, maxLng, maxLat] = params.bbox
    pool = pool.filter((a) => {
      const coords = a.location?.coordinates
      if (!coords) return false
      const [lat, lng] = coords
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
    })
  }

  // Location filter
  let centerLocation: { name: string; latitude: number; longitude: number } | undefined
  const locId = params.locationId || params.location
  if (locId && locId !== 'all' && locId !== 'global') {
    const targetLoc = getLocationById(locId)
    if (targetLoc) {
      centerLocation = {
        name: targetLoc.displayName,
        latitude: targetLoc.coordinates[0],
        longitude: targetLoc.coordinates[1],
      }
      const aliases = targetLoc.aliases.map((al) => al.toLowerCase())
      pool = pool.filter((a) => {
        const loc = a.location
        if (!loc) return false
        if (targetLoc.state && loc.state && loc.state.toLowerCase() === targetLoc.state.toLowerCase()) return true
        if (targetLoc.city && loc.city && loc.city.toLowerCase() === targetLoc.city.toLowerCase()) return true
        if (targetLoc.country && loc.country && loc.country.toLowerCase() === targetLoc.country.toLowerCase()) return true
        const text = `${a.title} ${a.summary} ${(a.content || []).join(' ')}`.toLowerCase()
        return aliases.some((al) => text.includes(al))
      })
    }
  }

  // Search query (combined topic + location)
  let queryTopic: string | undefined
  let queryLoc: string | undefined
  if (params.q && params.q.trim()) {
    const q = params.q.trim().toLowerCase()
    const prepMatch = q.match(/^(.*?)\s+(?:in|from|at|near)\s+(.+)$/i)
    if (prepMatch) {
      queryTopic = prepMatch[1].trim()
      queryLoc = prepMatch[2].trim()
    } else {
      queryTopic = q
    }

    if (queryLoc && queryTopic) {
      const both = pool.filter((a) => {
        const locText = `${a.location?.city || ''} ${a.location?.state || ''} ${a.location?.country || ''} ${a.title}`.toLowerCase()
        const topicText = `${a.title} ${a.summary} ${a.source.name} ${(a.content || []).join(' ')}`.toLowerCase()
        return locText.includes(queryLoc!) && topicText.includes(queryTopic!)
      })
      if (both.length > 0) {
        pool = both
      } else {
        const locMatches = pool.filter((a) => {
          const locText = `${a.location?.city || ''} ${a.location?.state || ''} ${a.location?.country || ''} ${a.title}`.toLowerCase()
          return locText.includes(queryLoc!)
        })
        pool = locMatches.length > 0 ? locMatches : pool.filter((a) => {
          const topicText = `${a.title} ${a.summary} ${a.source.name} ${(a.content || []).join(' ')}`.toLowerCase()
          return topicText.includes(queryTopic!)
        })
      }
    } else if (queryLoc) {
      pool = pool.filter((a) => {
        const text = `${a.location?.city || ''} ${a.location?.state || ''} ${a.location?.country || ''} ${a.title}`.toLowerCase()
        return text.includes(queryLoc!)
      })
    } else if (queryTopic) {
      pool = pool.filter((a) => {
        const text = `${a.title} ${a.summary} ${a.source.name} ${(a.content || []).join(' ')}`.toLowerCase()
        return text.includes(queryTopic!)
      })
    }
  }

  // Category filter
  if (params.category && params.category !== 'all' && params.category !== 'All') {
    const catLower = params.category.toLowerCase()
    pool = pool.filter((a) => {
      const catId = a.categoryId.toLowerCase()
      const catName = a.categoryName.toLowerCase()
      return catId === catLower || catName.includes(catLower)
    })
  }

  // Language filter
  if (params.language && params.language !== 'all') {
    if (params.language === 'hi') {
      pool = pool.filter((a) => Boolean(a.titleHi && a.summaryHi))
    }
  }

  // Date range filter
  if (params.dateRange && params.dateRange !== 'all') {
    pool = pool.filter((a) =>
      matchDatePreset(
        a.publishedDate || a.publishedAt,
        params.dateRange as any,
        params.startDate,
        params.endDate
      )
    )
  }

  // Sorting
  if (params.sort === 'oldest') {
    pool.sort((a, b) => (a.publishedDate > b.publishedDate ? 1 : -1))
  } else {
    pool.sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1))
  }

  const limit = params.limit || 50
  const finalArticles = pool.slice(0, limit)

  return {
    articles: finalArticles,
    total: finalArticles.length,
    centerLocation,
    queryMeta: {
      topic: queryTopic,
      location: queryLoc,
    },
  }
}


// ----------------------------------------------------------------------
// Authentication Service (Real Express Backend Integration)
// ----------------------------------------------------------------------

const defaultHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-guest-session': getGuestSessionId(),
  }
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function formatUserInitials(name: string): string {
  if (!name) return 'UP'
  const parts = name.split(' ').filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'UP'
}

export async function loginApi(credentials: {
  email: string
  password: string
}): Promise<{ token: string; user: UserProfile }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(credentials),
    })

    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Invalid email or password')
    }

    const rawUser = json.user
    const userProfile: UserProfile = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      initials: formatUserInitials(rawUser.name),
      role: rawUser.role || 'user',
    }

    setAuthToken(json.token)
    try {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(userProfile))
    } catch {
      // Storage fallback
    }

    return { token: json.token, user: userProfile }
  } catch (err: any) {
    // If it's a real API error response from the backend (e.g. 401, 400), propagate it
    if (
      err.message &&
      !err.message.includes('fetch') &&
      !err.message.includes('Failed to parse URL') &&
      !err.message.includes('ECONNREFUSED')
    ) {
      throw err
    }
    throw new Error(err.message || 'Unable to connect to authentication service')
  }
}

export async function registerApi(data: {
  name: string
  email: string
  password: string
  city?: string
  language?: string
  topics?: string[]
}): Promise<{ token: string; user: UserProfile }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Registration failed. Please check your details.')
    }

    const rawUser = json.user
    const userProfile: UserProfile = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      initials: formatUserInitials(rawUser.name),
      role: rawUser.role || 'user',
    }

    setAuthToken(json.token)
    try {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(userProfile))
    } catch {
      // Storage fallback
    }

    return { token: json.token, user: userProfile }
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('fetch') &&
      !err.message.includes('Failed to parse URL') &&
      !err.message.includes('ECONNREFUSED')
    ) {
      throw err
    }
    throw new Error(err.message || 'Unable to connect to authentication service')
  }
}

export async function logoutApi(): Promise<void> {
  const token = getAuthToken()
  try {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: defaultHeaders(),
      })
    }
  } catch {
    // Non-blocking logout network error
  } finally {
    setAuthToken(null)
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION)
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    } catch {
      // Storage fallback
    }
  }
}

export async function getAuthMeApi(): Promise<UserProfile | null> {
  const token = getAuthToken()
  if (!token) return null

  try {
    const res = await fetch('/api/auth/me', {
      headers: defaultHeaders(),
    })

    if (res.status === 401) {
      // Token is expired or invalidated
      setAuthToken(null)
      try {
        localStorage.removeItem(STORAGE_KEYS.USER_SESSION)
      } catch {
        // Storage fallback
      }
      return null
    }

    const json = await res.json()
    if (!res.ok || !json.success || !json.user) {
      return null
    }

    const rawUser = json.user
    const userProfile: UserProfile = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      initials: formatUserInitials(rawUser.name),
      role: rawUser.role || 'user',
    }

    try {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(userProfile))
    } catch {
      // Storage fallback
    }

    return userProfile
  } catch {
    // Offline / fallback to stored session if present
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION)
      if (raw) return JSON.parse(raw)
    } catch {
      // Storage fallback
    }
    return null
  }
}

export async function syncPreferencesApi(preferences: {
  categories?: string[]
  topics?: string[]
  city?: string
  language?: string
}): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences))
    const token = getAuthToken()
    if (token) {
      await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: defaultHeaders(),
        body: JSON.stringify(preferences),
      })
    }
  } catch {
    // Non-blocking
  }
}

// ----------------------------------------------------------------------
// Bookmarks Service (Real Express Backend + Offline Storage Fallback)
// ----------------------------------------------------------------------

export async function fetchServerBookmarks(): Promise<Article[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/bookmarks', {
        headers: defaultHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const mapped = json.data.map(mapBackendArticleToFrontend)
          try {
            const serverIds = mapped.map((a: Article) => a.id)
            localStorage.setItem(STORAGE_KEYS.SAVED_ARTICLES, JSON.stringify(serverIds))
          } catch {
            // Storage fallback
          }
          return mapped
        }
      }
    } catch {
      // Backend not reached or offline; gracefully fall through to local fallback
    }
  }

  // Intentional offline / guest fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_ARTICLES)
    const savedIds: string[] = raw ? JSON.parse(raw) : []
    return NEWS_ARTICLES.filter((a) => savedIds.includes(a.id))
  } catch {
    return []
  }
}

export async function addServerBookmark(articleId: string): Promise<boolean> {
  // Always update local cache for immediate UI feedback
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_ARTICLES)
    const savedIds: string[] = raw ? JSON.parse(raw) : []
    if (!savedIds.includes(articleId)) {
      savedIds.push(articleId)
      localStorage.setItem(STORAGE_KEYS.SAVED_ARTICLES, JSON.stringify(savedIds))
    }
  } catch {
    // Storage fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: defaultHeaders(),
        body: JSON.stringify({ articleId }),
      })
      if (res.ok) {
        const json = await res.json()
        return Boolean(json.success)
      }
    } catch (e) {
      console.warn('[Bookmarks] Server bookmarking unavailable, preserved in local storage:', (e as Error).message)
    }
  }
  return false
}

export async function deleteServerBookmark(articleId: string): Promise<boolean> {
  // Always update local cache
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_ARTICLES)
    const savedIds: string[] = raw ? JSON.parse(raw) : []
    const next = savedIds.filter((id) => id !== articleId)
    localStorage.setItem(STORAGE_KEYS.SAVED_ARTICLES, JSON.stringify(next))
  } catch {
    // Storage fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(articleId)}`, {
        method: 'DELETE',
        headers: defaultHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        return Boolean(json.success)
      }
    } catch (e) {
      console.warn('[Bookmarks] Server delete unavailable, removed from local storage:', (e as Error).message)
    }
  }
  return false
}

// ----------------------------------------------------------------------
// Community Section Service (Real Express Backend + Offline Local Fallback)
// ----------------------------------------------------------------------

export function mapBackendCommunityPostToFrontend(item: any): CommunityPost {
  const authorName = item.author?.name || item.authorName || 'Citizen Reporter'
  const authorEmail = item.author?.email || item.authorEmail
  const authorInitials = formatUserInitials(authorName)

  let formattedDate = 'Recently'
  if (item.createdAt) {
    try {
      formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    } catch {
      formattedDate = String(item.createdAt)
    }
  }

  const comments: CommunityComment[] = Array.isArray(item.comments)
    ? item.comments.map((c: any) => ({
        id: String(c.id),
        authorName: c.author?.name || c.authorName || 'Reader',
        authorInitials: formatUserInitials(c.author?.name || c.authorName || 'Reader'),
        content: c.content,
        createdAt: c.createdAt
          ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Just now',
      }))
    : []

  return {
    id: String(item.id),
    title: item.title,
    category: item.category || 'General Dispatches',
    content: item.description || item.content || '',
    sourceLink: item.sourceUrl || item.sourceLink || undefined,
    sourceExplanation: item.sourceExplanation || undefined,
    city: item.city || undefined,
    status: item.status || 'approved',
    verificationLevel: item.verificationLevel || 'unverified',
    authorName,
    authorEmail,
    authorInitials,
    createdAt: formattedDate,
    upvotes: item.upvotesCount !== undefined ? item.upvotesCount : (item.upvotes || 0),
    hasUpvoted: Boolean(item.hasUpvoted),
    comments,
  }
}

function getStoredCommunityPosts(): CommunityPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Storage fallback
  }
  return SEED_COMMUNITY_POSTS
}

function saveCommunityPosts(posts: CommunityPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts))
  } catch {
    // Storage fallback
  }
}

export async function fetchCommunityPostsApi(params?: {
  city?: string
  category?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  if (typeof window !== 'undefined') {
    try {
      const qParams = new URLSearchParams()
      if (params?.city) qParams.set('city', params.city)
      if (params?.category && params.category !== 'All Dispatches') qParams.set('category', params.category)
      if (params?.status) qParams.set('status', params.status)
      if (params?.search) qParams.set('search', params.search)
      if (params?.page) qParams.set('page', String(params.page))
      if (params?.limit) qParams.set('limit', String(params.limit))

      const res = await fetch(`/api/community?${qParams.toString()}`, {
        headers: defaultHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const mapped = json.data.map(mapBackendCommunityPostToFrontend)
          saveCommunityPosts(mapped)
          return { success: true, data: mapped }
        }
      }
    } catch {
      // Offline fallback
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 80))
  const posts = getStoredCommunityPosts()
  return { success: true, data: posts }
}

async function communityMutation(path: string, body?: unknown) {
  let res: Response
  try {
    res = await fetch(path, { method: 'POST', headers: defaultHeaders(), body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new Error('Unable to connect to the community service. Please try again.')
  }
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success || !json.data) {
    throw new Error(json?.error || 'The community action could not be saved. Please try again.')
  }
  return json.data
}

export async function createCommunityPostApi(payload: {
  title: string
  description: string
  city?: string
  locality?: string
  category: string
  sourceUrl?: string
  sourceExplanation?: string
  imageUrl?: string
  disclaimerAgreed: boolean
}) {
  const data = await communityMutation('/api/community', payload)
  const post = mapBackendCommunityPostToFrontend(data)
  const existing = getStoredCommunityPosts()
  saveCommunityPosts([post, ...existing.filter((p) => p.id !== post.id)])
  return post
}

export async function togglePostReactionApi(postId: string) {
  const data = await communityMutation(`/api/community/${encodeURIComponent(postId)}/reactions`)
  const reaction = { upvotes: data.totalUpvotes as number, hasUpvoted: Boolean(data.upvoted) }
  saveCommunityPosts(getStoredCommunityPosts().map((p) => p.id === postId ? { ...p, ...reaction } : p))
  return reaction
}

export async function fetchPostCommentsApi(postId: string) {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/comments`, {
        headers: defaultHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          return json.data.map((c: any) => ({
            id: String(c.id),
            authorName: c.author?.name || 'Reader',
            authorInitials: formatUserInitials(c.author?.name || 'Reader'),
            content: c.content,
            createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
          }))
        }
      }
    } catch {
      // Offline fallback
    }
  }

  const posts = getStoredCommunityPosts()
  const target = posts.find((p) => p.id === postId)
  return target?.comments || []
}

export async function addCommentApi(postId: string, content: string) {
  const data = await communityMutation(`/api/community/${encodeURIComponent(postId)}/comments`, { content: content.trim() })
  const comment: CommunityComment = {
    id: String(data.id),
    authorName: data.author?.name || 'Reader',
    authorInitials: formatUserInitials(data.author?.name || 'Reader'),
    content: data.content,
    createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now',
  }
  saveCommunityPosts(getStoredCommunityPosts().map((p) => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p))
  return comment
}

export async function reportCommunityPostApi(
  postId: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; message: string }> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/report`, {
        method: 'POST',
        headers: defaultHeaders(),
        body: JSON.stringify({ reason: reason.trim(), details: details?.trim() }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        return { success: true, message: json.message || 'Report submitted to editorial moderators.' }
      }
      return { success: false, message: json.error || 'Failed to submit report' }
    } catch {
      // Local fallback
    }
  }
  return { success: false, message: 'Unable to submit your report. Please reconnect and try again.' }
}

export async function moderateCommunityPostApi(
  postId: string,
  status: 'approved' | 'rejected' | 'pending',
  verificationLevel?: 'unverified' | 'verified'
): Promise<{ success: boolean; message: string }> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/moderate`, {
        method: 'POST',
        headers: defaultHeaders(),
        body: JSON.stringify({ status, verificationLevel }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        const posts = getStoredCommunityPosts()
        const updated = posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                status,
                ...(verificationLevel ? { verificationLevel } : {}),
              }
            : p
        )
        saveCommunityPosts(updated)
        return { success: true, message: json.message || `Post status updated to ${status}` }
      }
      return { success: false, message: json.error || 'Moderation action rejected' }
    } catch {
      // Local fallback
    }
  }
  return { success: false, message: 'Moderation service unavailable' }
}

// ----------------------------------------------------------------------
// AI Editorial Assistant (Backend & Local Fallback)
// ----------------------------------------------------------------------

export async function askAiAssistantApi(payload: {
  message: string
  articleContext?: {
    title?: string
    publisher?: string
    url?: string
    summary?: string
    content?: string
    category?: string
  }
  language?: 'en' | 'hi'
  history?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<{ reply: string; isAiLive: boolean; model: string }> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.success && json.reply) {
        return {
          reply: json.reply,
          isAiLive: Boolean(json.isAiLive),
          model: json.model || 'Gemini 1.5 Flash',
        }
      }
    }
  } catch {
    // Offline or test fallback
  }

  // Realistic thinking latency
  await new Promise((resolve) => setTimeout(resolve, 300))

  const matchedArticle = payload.articleContext
    ? ({
        title: payload.articleContext.title,
        source: { name: payload.articleContext.publisher || 'Upwise Wire' },
        summary: payload.articleContext.summary || '',
        categoryName: payload.articleContext.category || 'General',
      } as Article)
    : null

  const result = generateSimulatedAiResponse(payload.message, matchedArticle)

  return {
    reply: result.reply,
    isAiLive: false,
    model: result.modelName,
  }
}

// ----------------------------------------------------------------------
// Evidence Lens: Real Web Search Claim Verification
// ----------------------------------------------------------------------

export interface EvidenceLensItem {
  sourceTitle: string
  sourceUrl: string
  quote: string
  date?: string
}

export interface EvidenceLensResult {
  success: boolean
  claim: string
  searchAvailable: boolean
  searchProvider?: string
  verdict: 'supported' | 'contradicted' | 'inconclusive' | 'unverified'
  summary: string
  evidence: {
    supporting: EvidenceLensItem[]
    contradicting: EvidenceLensItem[]
    inconclusive: EvidenceLensItem[]
  }
  sources: Array<{ title: string; url: string; date?: string }>
  aiInterpretation: string
  retrievedAt: string
}

export async function checkClaimEvidenceApi(payload: {
  claim: string
  articleContext?: {
    title?: string
    publisher?: string
    url?: string
    summary?: string
    content?: string
    category?: string
    publishedAt?: string
  }
  language?: 'en' | 'hi'
}): Promise<EvidenceLensResult> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/ai/evidence-lens', {
        method: 'POST',
        headers: defaultHeaders(),
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          return json
        }
      }
    } catch {
      // Offline fallback
    }
  }

  // Graceful offline fallback
  const claimText = payload.claim.trim()
  const articleCtx = payload.articleContext

  if (articleCtx && (articleCtx.summary || articleCtx.content)) {

    const excerpt = (articleCtx.summary || articleCtx.content || '').slice(0, 240)
    const item: EvidenceLensItem = {
      sourceTitle: articleCtx.publisher || 'Accredited Source',
      sourceUrl: articleCtx.url || '#',
      quote: `"...${excerpt}..."`,
      date: articleCtx.publishedAt ? new Date(articleCtx.publishedAt).toLocaleDateString() : 'Recent',
    }

    return {
      success: true,
      claim: claimText,
      searchAvailable: false,
      searchProvider: 'Primary Article Context (Web Search Offline)',
      verdict: 'inconclusive',
      summary: 'Claim could not be corroborated from primary article text alone.',
      evidence: {
        supporting: [],
        contradicting: [],
        inconclusive: [item],
      },
      sources: [{ title: articleCtx.publisher || 'Primary Article', url: articleCtx.url || '#', date: item.date }],
      aiInterpretation: `Evaluated exclusively against the primary article text from ${articleCtx.publisher}. Live web search (Tavily) requires an online server with TAVILY_API_KEY. No external sources were fabricated.`,
      retrievedAt: new Date().toISOString(),
    }
  }

  return {
    success: true,
    claim: claimText,
    searchAvailable: false,
    searchProvider: 'None',
    verdict: 'unverified',
    summary: 'Live web evidence retrieval is currently unavailable because the backend search provider is offline or unconfigured.',
    evidence: { supporting: [], contradicting: [], inconclusive: [] },
    sources: [],
    aiInterpretation: 'Transparent Status: Without a configured search provider, no web citations could be retrieved. Upwise never fabricates evidence.',
    retrievedAt: new Date().toISOString(),
  }
}
