import React, { useState, useEffect, useRef } from 'react'
import { ArrowUp, Check, Compass, Filter, SlidersHorizontal, Sparkles, TrendingUp, X } from 'lucide-react'
import { Article, LanguageMode, LayoutMode, DatePreset } from '../../types/news'
import { SocialFeedCard } from './SocialFeedCard'
import { ONBOARDING_TOPICS } from '../auth/PersonalizeFeedOnboarding'
import { matchDatePreset } from '../../utils/dateUtils'
import { FEED_TOPICS } from '../../config/feedTopics'

interface NewsFeedProps {
  filters?: React.ReactNode
  articles: Article[]
  selectedCategoryId: string | null
  selectedSubcategoryId: string | null
  onSelectCategory?: (groupId: string, subcategoryId?: string) => void
  searchQuery: string
  language?: LanguageMode
  datePreset?: DatePreset
  customStartDate?: string
  customEndDate?: string
  selectedPublishers?: string[]
  layoutMode?: LayoutMode
  isSavedViewActive?: boolean
  userPreferredTopics?: string[]
  onArticleClick: (article: Article) => void
  savedArticleIds?: string[]
  onToggleSave?: (articleId: string, e: React.MouseEvent) => void
  likedArticleIds?: string[]
  onToggleLike?: (articleId: string, e: React.MouseEvent) => void
  onClearFilters: () => void
  onEditPreferences?: () => void
  onShareStory?: (article: Article, e: React.MouseEvent) => void
}

const TOPIC_MATCH_RULES: Record<string, { categoryId?: string; subcategoryId?: string; keywords?: string[] }> = {
  'tech-computing': { categoryId: 'tech-science', keywords: ['silicon', 'photonics', 'computing', 'chip', 'semiconductor'] },
  'india-national': { categoryId: 'india-politics', subcategoryId: 'pol-national', keywords: ['transit', 'highway', 'freight', 'national'] },
  'business-markets': { categoryId: 'business-economy', subcategoryId: 'biz-banking', keywords: ['rbi', 'repo', 'markets', 'gdp', 'inflation'] },
  'science-innovation': { categoryId: 'tech-science', keywords: ['r&d', 'science', 'consortium', 'research', 'optical'] },
  'sports': { categoryId: 'sports', keywords: ['cricket', 'test', 'bowling', 'championship'] },
  'world-news': { categoryId: 'world-lifestyle', keywords: ['global', 'dispatch', 'world'] },
  'politics-gov': { categoryId: 'india-politics', subcategoryId: 'pol-governance', keywords: ['court', 'guidelines', 'waste', 'governance'] },
  'entertainment-culture': { categoryId: 'world-lifestyle', keywords: ['stepwells', 'architecture', 'heritage', 'culture'] },
  'career-education': { categoryId: 'business-economy', keywords: ['workforce', 'education'] },
  'startups-ai': { categoryId: 'tech-science', keywords: ['ai', 'server', 'foundry', 'models'] },
}

function publicationTimestamp(article: Article, now: number): number {
  const absolute = Date.parse(article.publishedAt)
  if (!Number.isNaN(absolute)) return absolute
  const relative = article.publishedAt.match(/^(\d+)\s+(min(?:ute)?s?|hours?|days?)\s+ago$/i)
  if (relative) {
    const unit = relative[2].toLowerCase()
    return now - Number(relative[1]) * (unit.startsWith('min') ? 60000 : unit.startsWith('hour') ? 3600000 : 86400000)
  }
  if (/^(just now|today)$/i.test(article.publishedAt)) return now
  return Date.parse(article.publishedDate) || 0
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  filters,
  articles,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  searchQuery,
  language = 'en',
  datePreset = 'all',
  customStartDate = '',
  customEndDate = '',
  selectedPublishers = [],
  layoutMode = 'grid',
  isSavedViewActive = false,
  userPreferredTopics = [],
  onArticleClick,
  savedArticleIds = [],
  onToggleSave,
  likedArticleIds = [],
  onToggleLike,
  onClearFilters,
  onEditPreferences,
  onShareStory,
}) => {
  const [visibleCount, setVisibleCount] = useState(6)
  const [activeTab, setActiveTab] = useState<'for-you' | 'latest' | 'trending'>('for-you')
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    setVisibleCount(6)
  }, [
    selectedCategoryId,
    selectedSubcategoryId,
    searchQuery,
    datePreset,
    customStartDate,
    customEndDate,
    selectedPublishers,
    isSavedViewActive,
    activeTab,
  ])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredArticles = articles.filter((article) => {
    if (!isSavedViewActive && activeTab === 'trending' && !article.isTrending) return false
    if (isSavedViewActive && !savedArticleIds.includes(article.id)) {
      return false
    }

    if (selectedCategoryId && article.categoryId !== selectedCategoryId) {
      return false
    }
    if (selectedSubcategoryId && article.subcategoryId !== selectedSubcategoryId) {
      return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = article.title.toLowerCase().includes(q)
      const titleHiMatch = article.titleHi?.toLowerCase().includes(q)
      const deckMatch = article.deck?.toLowerCase().includes(q)
      const summaryMatch = article.summary.toLowerCase().includes(q)
      const summaryHiMatch = article.summaryHi?.toLowerCase().includes(q)
      if (!titleMatch && !titleHiMatch && !deckMatch && !summaryMatch && !summaryHiMatch) {
        return false
      }
    }

    if (selectedPublishers.length > 0 && !selectedPublishers.includes(article.source.name)) {
      return false
    }

    if (!matchDatePreset(article.publishedAt && !Number.isNaN(Date.parse(article.publishedAt)) ? article.publishedAt : article.publishedDate, datePreset, customStartDate, customEndDate)) {
      return false
    }

    return true
  })

  const deduplicatedArticles = Array.from(
    new Map(filteredArticles.map((item) => [item.id, item])).values()
  )

  const sortReference = Date.now()
  const rankedArticles = [...deduplicatedArticles].sort((a, b) => {
    if (activeTab === 'latest' || activeTab === 'trending') {
      return publicationTimestamp(b, sortReference) - publicationTimestamp(a, sortReference)
    }
    if (userPreferredTopics.length === 0) return 0

    let scoreA = 0
    let scoreB = 0

    userPreferredTopics.forEach((topicId) => {
      const rule = TOPIC_MATCH_RULES[topicId]
      if (!rule) return

      if (rule.categoryId && a.categoryId === rule.categoryId) scoreA += 2
      if (rule.subcategoryId && a.subcategoryId === rule.subcategoryId) scoreA += 3
      if (rule.keywords) {
        const textA = (a.title + ' ' + (a.deck || '') + ' ' + a.summary).toLowerCase()
        if (rule.keywords.some((kw) => textA.includes(kw))) scoreA += 1
      }

      if (rule.categoryId && b.categoryId === rule.categoryId) scoreB += 2
      if (rule.subcategoryId && b.subcategoryId === rule.subcategoryId) scoreB += 3
      if (rule.keywords) {
        const textB = (b.title + ' ' + (b.deck || '') + ' ' + b.summary).toLowerCase()
        if (rule.keywords.some((kw) => textB.includes(kw))) scoreB += 1
      }
    })

    return scoreB - scoreA
  })

  const isFiltered = Boolean(
    selectedCategoryId ||
      searchQuery.trim() ||
      datePreset !== 'all' ||
      selectedPublishers.length > 0 ||
      isSavedViewActive
  )

  const visibleArticles = rankedArticles.slice(0, visibleCount)
  const hasMore = visibleCount < rankedArticles.length

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + 6)
    }, { rootMargin: '300px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, visibleCount, activeTab])

  const trending = [...articles.filter((article) => article.isTrending), ...articles.filter((article) => !article.isTrending)].slice(0, 3)
  const preferredLabels = ONBOARDING_TOPICS.filter((topic) => userPreferredTopics.includes(topic.id)).map((topic) => topic.name)

  return (
    <div className="mx-auto w-full max-w-[1040px] pb-6 pt-1 sm:pt-2">
      <div className="mb-3">
        <div className="relative grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="mx-auto w-full max-w-[720px] text-center sm:px-28 xl:px-0">
          <div className="mb-1.5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B857A]"><span className="h-1.5 w-1.5 rounded-full bg-[#D95D39]" /> Your daily perspective</div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight sm:text-[32px] tracking-tight text-[#141412]">{isSavedViewActive ? 'Your saved stories' : 'A world worth following.'}</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">{isSavedViewActive ? 'Good reads, kept close.' : 'Fresh perspectives. Trusted publishers. Your kind of news.'}</p>
          </div>
          {onEditPreferences && <button type="button" onClick={onEditPreferences} className="absolute right-0 top-0 hidden shrink-0 items-center gap-2 rounded-full border border-[#DDD9D0] bg-white px-3.5 py-2 text-[11px] font-semibold text-[#55504A] transition-colors hover:border-[#0F392B] sm:inline-flex"><SlidersHorizontal className="h-3.5 w-3.5" />Personalize</button>}
        </div>
        {filters && (
          <div className="mt-2 w-full xl:ml-auto xl:w-[260px]" aria-label="News filters">
            {filters}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="mx-auto w-full min-w-0 max-w-[720px]" aria-label="News feed">
          <div className="mb-2 overflow-hidden rounded-2xl border border-[#E8E2D8] bg-white">
            {!isSavedViewActive && <div className="grid grid-cols-3 border-b border-[#F0ECE5] px-2" role="tablist" aria-label="Feed order">
              {([{ id: 'for-you', label: 'For you', icon: Sparkles }, { id: 'latest', label: 'Latest', icon: Compass }, { id: 'trending', label: 'Trending', icon: TrendingUp }] as const).map((tab) => <button key={tab.id} id={`feed-tab-${tab.id}`} aria-controls="news-feed-posts" type="button" role="tab" aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => {
                const tabs = ['for-you', 'latest', 'trending'] as const
                const index = tabs.indexOf(tab.id)
                const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
                if (next < 0) return
                event.preventDefault()
                setActiveTab(tabs[next])
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
              }} className={`relative flex min-h-[52px] items-center justify-center gap-1.5 text-xs transition-colors ${activeTab === tab.id ? 'font-bold text-[#0F392B]' : 'font-medium text-[#878176] hover:text-[#0F392B]'}`}><tab.icon className="h-3.5 w-3.5" />{tab.label}{activeTab === tab.id && <span className="absolute inset-x-5 bottom-0 h-[3px] rounded-t-full bg-[#0F392B]" />}</button>)}
            </div>}
            <div className="feed-topics flex items-center gap-2 overflow-x-auto px-3 py-3 sm:flex-wrap sm:overflow-visible sm:px-4" aria-label="Quick topic filters">
              <button type="button" onClick={onClearFilters} aria-pressed={!selectedCategoryId && !isSavedViewActive} className={`shrink-0 rounded-full border px-2.5 py-1 text-[13px] leading-5 font-medium transition-colors ${!selectedCategoryId && !isSavedViewActive ? 'border-[#0F392B] bg-[#0F392B] text-white' : 'border-[#E8E2D8] text-[#78716C] hover:border-[#0F392B]'}`}>All stories</button>
              {FEED_TOPICS.map((topic) => {
                const active = selectedCategoryId === topic.categoryId && (topic.subcategoryId ? selectedSubcategoryId === topic.subcategoryId : !selectedSubcategoryId)
                return (
                  <button
                    type="button"
                    key={topic.id}
                    onClick={() => onSelectCategory?.(topic.categoryId, topic.subcategoryId)}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[13px] leading-5 font-medium transition-colors ${active ? 'border-[#0F392B] bg-[#0F392B] text-white' : 'border-[#E8E2D8] text-[#78716C] hover:border-[#0F392B] hover:text-[#0F392B]'}`}
                  >
                    {topic.label}
                  </button>
                )
              })}
            </div>
          </div>

          {isFiltered && <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#E8E2D8] bg-white px-4 py-3 text-[11px]"><span className="min-w-0 truncate text-[#78716C]">{isSavedViewActive ? 'Saved library' : searchQuery ? `Results for “${searchQuery}”` : 'Filtered feed'} · {rankedArticles.length} stories</span><button type="button" onClick={onClearFilters} className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#A7492F]"><X className="h-3 w-3" />Reset</button></div>}
          {preferredLabels.length > 0 && activeTab === 'for-you' && !isFiltered && <p className="mb-4 flex items-center gap-2 px-1 text-[10px] text-[#78716C]"><Sparkles className="h-3 w-3 shrink-0 text-[#A7492F]" /><span className="truncate">Picked for your interests in {preferredLabels.slice(0, 2).join(' and ')}</span></p>}

          <div id="news-feed-posts" role={isSavedViewActive ? undefined : 'tabpanel'} aria-labelledby={isSavedViewActive ? undefined : `feed-tab-${activeTab}`} className="space-y-3">
            {visibleArticles.map((article) => (
              <SocialFeedCard
                key={article.id}
                article={article}
                language={language}
                compact={layoutMode === 'stack'}
                onArticleClick={onArticleClick}
                isSaved={savedArticleIds.includes(article.id)}
                onToggleSave={onToggleSave}
                isLiked={likedArticleIds.includes(article.id)}
                onToggleLike={onToggleLike}
                onShare={onShareStory}
              />
            ))}
          </div>

          {rankedArticles.length === 0 && <div className="rounded-2xl border border-[#E8E2D8] bg-white px-6 py-14 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EDF3EF] text-[#0F392B]">{activeTab === 'trending' ? <TrendingUp className="h-5 w-5" /> : <Filter className="h-5 w-5" />}</div><h2 className="font-serif text-2xl font-semibold">{activeTab === 'trending' && !isSavedViewActive ? 'No trending stories here just yet.' : 'No stories here just yet.'}</h2><p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[#78716C]">Try another topic or explore your feed to discover more stories.</p><button type="button" onClick={() => { setActiveTab('for-you'); onClearFilters() }} className="mt-5 rounded-full bg-[#0F392B] px-5 py-2.5 text-xs font-semibold text-white">Explore your feed</button></div>}

          <div ref={loadMoreRef} className="py-7 text-center">
            {hasMore ? <button type="button" onClick={() => setVisibleCount((count) => count + 6)} className="rounded-full border border-[#DDD9D0] bg-white px-5 py-2.5 text-xs font-semibold text-[#0F392B] hover:border-[#0F392B]">Load more stories</button> : rankedArticles.length > 0 && <><div className="mx-auto mb-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE8E1] text-[#0F392B]"><Check className="h-4 w-4" /></div><p className="text-xs font-semibold text-[#55504A]">You’re all caught up.</p><p className="mt-1 text-[10px] text-[#918A80]">You’ve seen all {rankedArticles.length} stories in this feed.</p></>}
          </div>
        </section>

        <aside className="sticky top-6 hidden space-y-5 xl:block" aria-label="Feed discoveries">
          <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5"><div className="mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#A7492F]" /><h2 className="text-xs font-bold">In the conversation</h2></div><div className="space-y-5">{trending.map((article, index) => <button key={article.id} type="button" onClick={() => onArticleClick(article)} className="group flex gap-3 text-left"><span className="mt-0.5 font-serif text-xl text-[#C1BAAD]">0{index + 1}</span><span><span className="mb-1 block text-[9px] font-medium text-[#A7492F]">{article.categoryName}</span><span className="line-clamp-3 block font-serif text-[16px] font-semibold leading-snug group-hover:text-[#0F392B]">{language === 'hi' && article.titleHi ? article.titleHi : article.title}</span><span className="mt-1.5 block text-[9px] text-[#918A80]">{article.source.name}</span></span></button>)}</div></section>
          <div className="px-1"><p className="font-serif text-xl font-semibold text-[#0F392B]">Less noise. More perspective.</p><p className="mt-2 text-[10px] leading-relaxed text-[#918A80]">An informed scroll, one story at a time.</p><span className="mt-4 block text-[9px] uppercase tracking-wider text-[#B2AB9F]">UPWISE HUB · {new Date().getFullYear()}</span></div>
        </aside>
      </div>
      {showScrollTop && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top of feed" className="fixed bottom-24 left-4 z-40 rounded-full border border-[#E8E2D8] bg-white p-3 text-[#0F392B] shadow-md md:bottom-6"><ArrowUp className="h-4 w-4" /></button>}
    </div>
  )
}
