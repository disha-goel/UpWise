export interface FeedTopic {
  id: string
  label: string
  categoryId: string
  subcategoryId?: string
}

/** The feed is the single home for news topic navigation. */
export const FEED_TOPICS: readonly FeedTopic[] = [
  { id: 'technology', label: 'Technology & Science', categoryId: 'tech-science' },
  { id: 'world', label: 'World & Lifestyle', categoryId: 'world-lifestyle' },
  { id: 'politics', label: 'India & Politics', categoryId: 'india-politics' },
  { id: 'sports', label: 'Sports', categoryId: 'sports' },
  { id: 'business', label: 'Business & Economy', categoryId: 'business-economy' },
  { id: 'science', label: 'Science', categoryId: 'tech-science', subcategoryId: 'tech-space' },
  { id: 'careers', label: 'Careers', categoryId: 'business-economy', subcategoryId: 'biz-careers' },
  { id: 'ai-startups', label: 'AI & Startups', categoryId: 'tech-science', subcategoryId: 'tech-ai' },
]
