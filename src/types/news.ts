import type { LanguageCode } from '../config/languages'

export interface ArticleAuthor {
  name: string
  role?: string
  avatar?: string
}

export interface ArticleSource {
  name: string
  verified: boolean
  url?: string
}

export interface ArticleLocation {
  country: string
  countryCode?: string
  state?: string
  city?: string
  region?: string
  coordinates?: [number, number] // [lat, lng]
  locationType?: 'about' | 'publisher' | 'regional'
}

export interface ArticleClusterMemberItem {
  id: string
  title: string
  publisher: string
  url: string
  publishedAt?: string
  imageUrl?: string
}

export interface ArticleCluster {
  id: string
  canonicalTitle: string
  sourceCount: number
  members: ArticleClusterMemberItem[]
}

export interface Article {
  id: string
  title: string
  titleHi?: string
  deck?: string
  deckHi?: string
  summary: string
  summaryHi?: string
  content: string[]
  contentHi?: string[]
  keyTakeaways?: string[]
  keyTakeawaysHi?: string[]
  categoryId: string
  categoryName: string
  subcategoryId?: string
  subcategoryName?: string
  source: ArticleSource
  author: ArticleAuthor
  publishedAt: string
  publishedDate: string
  readTime: string
  imageUrl: string
  imageCaption?: string
  originalUrl: string
  isLead?: boolean
  isTrending?: boolean
  location?: ArticleLocation
  cluster?: ArticleCluster
}

export type LayoutMode = 'stack' | 'grid'
export type LanguageMode = LanguageCode
export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export interface NewsFilters {
  categoryId: string | null
  subcategoryId: string | null
  searchQuery: string
  language: LanguageMode
  datePreset: DatePreset
  customStartDate: string
  customEndDate: string
  selectedPublishers: string[]
  layoutMode: LayoutMode
  onlySaved: boolean
}
