import React, { useState, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { AdvancedFilterBar } from './components/news/AdvancedFilterBar'
import { NewsFeed } from './components/news/NewsFeed'
import { ArticleReaderPanel } from './components/reader/ArticleReaderPanel'
import { Footer } from './components/layout/Footer'
import { EditorialStandardsModal, PolicyTab } from './components/layout/EditorialStandardsModal'
import { LoginPage } from './components/auth/LoginPage'
import { PersonalizeFeedOnboarding } from './components/auth/PersonalizeFeedOnboarding'
import { CommandDiscoveryOverlay } from './components/layout/CommandDiscoveryOverlay'
import { NavigationRail, NavDestination } from './components/layout/NavigationRail'
import { MobileBottomNav } from './components/layout/MobileBottomNav'
import { CommunityHub } from './components/community/CommunityHub'
import { EditorialComicsHub } from './components/community/EditorialComicsHub'
import { NewsGlobeHub } from './components/globe/NewsGlobeHub'
import { UserProfile } from './types/navigation'
import { isSupportedLanguage } from './config/languages'
import { Article, LanguageMode, DatePreset } from './types/news'
import { MOCK_ARTICLES } from './mock/articles.mock'
import { CATEGORY_GROUPS } from './mock/categories.mock'
import { AiChatWidget } from './components/assistant/AiChatWidget'
import {
  fetchArticlesFromBackend,
  fetchServerBookmarks,
  addServerBookmark,
  deleteServerBookmark,
  logoutApi,
  getAuthMeApi,
} from './services/api'

const isUserOnboardingComplete = (userId: string): boolean => {
  try {
    const storedFlag = localStorage.getItem(`upwise_user_onboarding_completed_${userId}`)
    const storedTopics = localStorage.getItem(`upwise_user_topics_${userId}`)
    const topics: string[] = storedTopics ? JSON.parse(storedTopics) : []
    return Boolean(storedFlag === 'true' && topics.length > 0)
  } catch {
    return false
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('upwise_user_session')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [currentView, setCurrentView] = useState<'feed' | 'login' | 'onboarding'>(() => {
    try {
      const session = localStorage.getItem('upwise_user_session')
      if (session) {
        const parsedUser: UserProfile = JSON.parse(session)
        if (!isUserOnboardingComplete(parsedUser.id)) {
          return 'onboarding'
        }
      }
    } catch {
      // Storage fallback
    }
    return 'feed'
  })

  const [destination, setDestination] = useState<NavDestination>('feed')
  const [openCommunityComposer, setOpenCommunityComposer] = useState(false)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const [language, setLanguage] = useState<LanguageMode>(() => {
    try {
      const session = localStorage.getItem('upwise_user_session')
      if (session) {
        const parsedUser: UserProfile = JSON.parse(session)
        const userLang = localStorage.getItem(`upwise_user_language_${parsedUser.id}`)
        if (isSupportedLanguage(userLang)) return userLang
      }
      const globalLang = localStorage.getItem('upwise_user_language')
      if (isSupportedLanguage(globalLang)) return globalLang
    } catch {
      // Storage fallback
    }
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem('upwise_user_language', language)
      if (user?.id) localStorage.setItem(`upwise_user_language_${user.id}`, language)
    } catch { /* Reading preferences remain available for this session. */ }
  }, [language, user?.id])

  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([])
  const [isSavedViewActive, setIsSavedViewActive] = useState<boolean>(false)

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('upwise_reduced_motion')
      if (stored !== null) return stored === 'true'
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })

  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [policyModalTab, setPolicyModalTab] = useState<PolicyTab>('charter')

  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false)
  const [discoveryInitialFocus, setDiscoveryInitialFocus] = useState<'search' | 'categories'>('search')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsDiscoveryOpen(true)
        setDiscoveryInitialFocus('search')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenDiscovery = (focus: 'search' | 'categories') => {
    setIsDiscoveryOpen(true)
    setDiscoveryInitialFocus(focus)
  }

  const [userPreferredTopics, setUserPreferredTopics] = useState<string[]>(() => {
    try {
      const session = localStorage.getItem('upwise_user_session')
      if (session) {
        const parsedUser = JSON.parse(session)
        const storedTopics = localStorage.getItem(`upwise_user_topics_${parsedUser.id}`)
        return storedTopics ? JSON.parse(storedTopics) : []
      }
    } catch {
      return []
    }
    return []
  })

  const [savedArticleIds, setSavedArticleIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('upwise_saved_articles')
      return stored ? JSON.parse(stored) : ['art-1', 'art-3']
    } catch {
      return ['art-1', 'art-3']
    }
  })

  const [likedArticleIds, setLikedArticleIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('upwise_liked_articles')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('upwise_liked_articles', JSON.stringify(likedArticleIds))
    } catch {
      // Storage fallback
    }
  }, [likedArticleIds])

  const [readingArticle, setReadingArticle] = useState<Article | null>(null)
  const [activeNotice, setActiveNotice] = useState<string | null>(null)
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES)
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)

  useEffect(() => {
    let isCurrent = true
    fetchArticlesFromBackend({
      language,
    }).then(({ articles: backendArticles }) => {
      if (isCurrent && backendArticles && backendArticles.length > 0) {
        setArticles(backendArticles)
      }
    }).catch(() => {})
    return () => { isCurrent = false }
  }, [language])

  useEffect(() => {
    let isCurrent = true
    getAuthMeApi().then((verifiedUser) => {
      if (!isCurrent) return
      if (verifiedUser) {
        setUser(verifiedUser)
      } else if (user) {
        setUser(null)
      }
    }).catch(() => {})
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    fetchServerBookmarks().then((serverBookmarks) => {
      if (serverBookmarks.length > 0) {
        setSavedArticleIds((prev) => Array.from(new Set([...prev, ...serverBookmarks.map((b) => b.id)])))
      }
    }).catch(() => {})
  }, [user])

  const showTemporaryNotice = (msg: string) => {
    setActiveNotice(msg)
    setTimeout(() => {
      setActiveNotice((current) => (current === msg ? null : current))
    }, 3500)
  }

  useEffect(() => {
    try {
      localStorage.setItem('upwise_saved_articles', JSON.stringify(savedArticleIds))
    } catch {
      // Storage fallback
    }
  }, [savedArticleIds])

  useEffect(() => {
    try {
      localStorage.setItem('upwise_reduced_motion', String(reducedMotion))
      if (reducedMotion) {
        document.documentElement.classList.add('reduced-motion')
      } else {
        document.documentElement.classList.remove('reduced-motion')
      }
    } catch {
      // Storage fallback
    }
  }, [reducedMotion])

  const availablePublishers = Array.from(
    new Set(articles.map((a) => a.source.name))
  ).sort()

  const handleSelectCategory = (groupId: string, subcategoryId?: string) => {
    setDestination('feed')
    setSelectedCategoryId(groupId || null)
    setSelectedSubcategoryId(subcategoryId || null)
    setIsSavedViewActive(false)

    const group = CATEGORY_GROUPS.find((g) => g.id === groupId)
    const sub = group?.subcategories.find((s) => s.id === subcategoryId)

    if (group && sub) {
      showTemporaryNotice(`Desk: ${group.name} › ${sub.name}`)
    } else if (group) {
      showTemporaryNotice(`Desk: ${group.name}`)
    }
  }

  const handleSearch = (query: string) => {
    setDestination('feed')
    setSearchQuery(query)
    setIsSavedViewActive(false)
    if (query.trim()) {
      showTemporaryNotice(`Searching: "${query.trim()}"`)
    }
  }

  const handleClearFilters = () => {
    setSelectedCategoryId(null)
    setSelectedSubcategoryId(null)
    setSearchQuery('')
    setDatePreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setSelectedPublishers([])
    setIsSavedViewActive(false)
    showTemporaryNotice('All filters reset')
  }

  const handleTogglePublisher = (publisherName: string) => {
    setSelectedPublishers((prev) =>
      prev.includes(publisherName)
        ? prev.filter((p) => p !== publisherName)
        : [...prev, publisherName]
    )
  }

  const handleSelectAllPublishers = () => {
    setSelectedPublishers(availablePublishers)
  }

  const handleClearPublishers = () => {
    setSelectedPublishers([])
  }

  const handleToggleSave = (articleId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!user) {
      setReadingArticle(null)
      showTemporaryNotice('Please sign in to save stories.')
      setCurrentView('login')
      return
    }
    setSavedArticleIds((prev) => {
      const exists = prev.includes(articleId)
      const next = exists ? prev.filter((id) => id !== articleId) : [...prev, articleId]
      showTemporaryNotice(exists ? 'Removed from Saved' : 'Saved to library')
      if (exists) {
        deleteServerBookmark(articleId)
      } else {
        addServerBookmark(articleId)
      }
      return next
    })
  }

  const handleToggleLike = (articleId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!user) {
      setReadingArticle(null)
      showTemporaryNotice('Please sign in to like stories.')
      setCurrentView('login')
      return
    }
    setLikedArticleIds((prev) => {
      const exists = prev.includes(articleId)
      const next = exists ? prev.filter((id) => id !== articleId) : [...prev, articleId]
      showTemporaryNotice(exists ? 'Removed from liked stories' : 'Liked story')
      return next
    })
  }

  const handleShareStory = async (article: Article, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await navigator.clipboard.writeText(article.originalUrl || window.location.href)
      showTemporaryNotice('Story link copied to clipboard')
    } catch {
      showTemporaryNotice('Could not copy the link. Open the original source to share it.')
    }
  }

  const handleOpenLogin = () => {
    setCurrentView('login')
  }

  const handleSignInSuccess = (signedInUser: UserProfile) => {
    setUser(signedInUser)
    try {
      localStorage.setItem('upwise_user_session', JSON.stringify(signedInUser))
    } catch {
      // Storage fallback
    }

    if (isUserOnboardingComplete(signedInUser.id)) {
      try {
        const storedTopics = localStorage.getItem(`upwise_user_topics_${signedInUser.id}`)
        if (storedTopics) {
          setUserPreferredTopics(JSON.parse(storedTopics))
        }
        const storedLang = localStorage.getItem(`upwise_user_language_${signedInUser.id}`)
        if (isSupportedLanguage(storedLang)) {
          setLanguage(storedLang)
        }
      } catch {
        // Storage fallback
      }
      setCurrentView('feed')
      showTemporaryNotice(`Welcome back, ${signedInUser.name}! Showing your curated feed.`)
    } else {
      setUserPreferredTopics([])
      setCurrentView('onboarding')
      showTemporaryNotice(`Welcome, ${signedInUser.name}! Please personalize your feed before continuing.`)
    }
  }

  const handleOnboardingComplete = (selectedTopicIds: string[], selectedLanguage: LanguageMode) => {
    setUserPreferredTopics(selectedTopicIds)
    setLanguage(selectedLanguage)

    const effectiveUser =
      user ||
      (() => {
        try {
          const stored = localStorage.getItem('upwise_user_session')
          return stored ? JSON.parse(stored) : null
        } catch {
          return null
        }
      })()

    if (effectiveUser) {
      try {
        localStorage.setItem(`upwise_user_topics_${effectiveUser.id}`, JSON.stringify(selectedTopicIds))
        localStorage.setItem(`upwise_user_language_${effectiveUser.id}`, selectedLanguage)
        localStorage.setItem(`upwise_user_onboarding_completed_${effectiveUser.id}`, 'true')
      } catch {
        // Storage fallback
      }
    }
    try {
      localStorage.setItem('upwise_user_language', selectedLanguage)
      localStorage.setItem('upwise_user_onboarding_completed', 'true')
    } catch {
      // Storage fallback
    }
    setCurrentView('feed')
    showTemporaryNotice('Preferences saved. Your Upwise Hub feed is customized.')
  }

  const handleSignOutClick = () => {
    setUser(null)
    setUserPreferredTopics([])
    setLikedArticleIds([])
    logoutApi().catch(() => {})
    setCurrentView('feed')
    showTemporaryNotice('Signed out.')
  }

  const handleNavigateSaved = () => {
    if (!user) {
      showTemporaryNotice('Please sign in to view saved stories.')
      setCurrentView('login')
      return
    }
    setDestination('feed')
    setIsSavedViewActive((prev) => !prev)
  }

  const handleNavigatePersonalize = () => {
    if (!user) {
      showTemporaryNotice('Please sign in to personalize your editorial desks.')
      setCurrentView('login')
      return
    }
    setCurrentView('onboarding')
  }

  const handleNavigateHome = () => {
    setDestination('feed')
    setCurrentView('feed')
    handleClearFilters()
  }

  const handleOpenPolicyModal = (tab: PolicyTab) => {
    setPolicyModalTab(tab)
    setPolicyModalOpen(true)
  }

  if (currentView === 'login') {
    return (
      <>
        <LoginPage
          onBackToFeed={() => setCurrentView('feed')}
          onSignInSuccess={handleSignInSuccess}
          onOpenPolicyModal={handleOpenPolicyModal}
        />
        <EditorialStandardsModal
          isOpen={policyModalOpen}
          initialTab={policyModalTab}
          onClose={() => setPolicyModalOpen(false)}
        />
      </>
    )
  }

  if (currentView === 'onboarding') {
    return (
      <PersonalizeFeedOnboarding
        initialTopics={userPreferredTopics}
        initialLanguage={language}
        userId={user?.id}
        onComplete={handleOnboardingComplete}
        onCancelEdit={() => setCurrentView('feed')}
        isEditing={Boolean(user && isUserOnboardingComplete(user.id))}
      />
    )
  }

  const activeGroup = CATEGORY_GROUPS.find((g) => g.id === selectedCategoryId)

  const feedFilters = (
    <AdvancedFilterBar
      datePreset={datePreset}
      onDatePresetChange={setDatePreset}
      customStartDate={customStartDate}
      customEndDate={customEndDate}
      onCustomDateChange={(start, end) => {
        setCustomStartDate(start)
        setCustomEndDate(end)
      }}
      availablePublishers={availablePublishers}
      selectedPublishers={selectedPublishers}
      onTogglePublisher={handleTogglePublisher}
      onSelectAllPublishers={handleSelectAllPublishers}
      onClearPublishers={handleClearPublishers}
      activeCategoryName={activeGroup?.name}
      onClearCategory={() => {
        setSelectedCategoryId(null)
        setSelectedSubcategoryId(null)
      }}
      searchQuery={searchQuery}
      onClearSearch={() => setSearchQuery('')}
      isSavedViewActive={isSavedViewActive}
      onClearSavedView={() => setIsSavedViewActive(false)}
      onResetAllFilters={handleClearFilters}
    />
  )

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#141412] flex flex-col font-sans">
      <Header
        user={user}
        language={language}
        onLanguageChange={setLanguage}
        selectedCategoryId={selectedCategoryId}
        selectedSubcategoryId={selectedSubcategoryId}
        onSelectCategory={handleSelectCategory}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery('')}
        onOpenDiscovery={handleOpenDiscovery}
        onCloseDiscovery={() => setIsDiscoveryOpen(false)}
        isDiscoveryOpen={isDiscoveryOpen}
        onLoginClick={handleOpenLogin}
        onSignOutClick={handleSignOutClick}
        onNavigateHome={handleNavigateHome}
        onNavigateSaved={handleNavigateSaved}
        isSavedViewActive={isSavedViewActive}
        savedCount={savedArticleIds.length}
        onNavigatePersonalize={handleNavigatePersonalize}
        activeDestination={destination}
        onSelectDestination={setDestination}
        onOpenNewPost={() => {
          if (!user) {
            showTemporaryNotice('Please sign in to publish a community dispatch.')
            setCurrentView('login')
            return
          }
          setDestination('community')
          setOpenCommunityComposer(true)
        }}

      />

      {activeNotice && (
        <div className="fixed bottom-6 right-6 z-40 bg-[#141412] text-[#FAF7F2] border border-[#E8E2D8]/40 px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-2 h-2 rounded-full bg-[#D95D39] shrink-0" />
          <span>{activeNotice}</span>
        </div>
      )}

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 flex gap-6 pt-4 sm:pt-6">
        <NavigationRail
          activeDestination={destination}
          onSelectDestination={setDestination}
          onOpenNewPost={() => {
            if (!user) {
              showTemporaryNotice('Please sign in to publish a community dispatch.')
              setCurrentView('login')
              return
            }
            setDestination('community')
            setOpenCommunityComposer(true)
          }}
          onNavigateHome={handleNavigateHome}
        />

        <main className="flex-1 min-w-0 max-w-7xl mx-auto">
          {destination === 'feed' && (
            <NewsFeed
              filters={feedFilters}
              articles={articles}
              selectedCategoryId={selectedCategoryId}
              selectedSubcategoryId={selectedSubcategoryId}
              onSelectCategory={handleSelectCategory}
              searchQuery={searchQuery}
              language={language}
              datePreset={datePreset}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              selectedPublishers={selectedPublishers}
              isSavedViewActive={isSavedViewActive}
              userPreferredTopics={userPreferredTopics}
              onArticleClick={(article) => setReadingArticle(article)}
              savedArticleIds={savedArticleIds}
              onToggleSave={handleToggleSave}
              likedArticleIds={likedArticleIds}
              onToggleLike={handleToggleLike}
              onClearFilters={handleClearFilters}
              onEditPreferences={() => setCurrentView('onboarding')}
              onShareStory={handleShareStory}
            />
          )}

          {destination === 'globe' && (
            <NewsGlobeHub
              articles={articles}
              onArticleClick={(article) => setReadingArticle(article)}
              onToggleSave={handleToggleSave}
              savedArticleIds={savedArticleIds}
            />
          )}

          {destination === 'community' && (
            <CommunityHub
              currentUser={user}
              openComposerDirectly={openCommunityComposer}
              onComposerClosed={() => setOpenCommunityComposer(false)}
              onRequireLogin={handleOpenLogin}
            />
          )}

          {destination === 'comics' && (
            <EditorialComicsHub />
          )}
        </main>
      </div>

      <MobileBottomNav
        activeDestination={destination}
        onSelectDestination={setDestination}
      />

      <ArticleReaderPanel
        article={readingArticle}
        language={language}
        onClose={() => setReadingArticle(null)}
        isSaved={readingArticle ? savedArticleIds.includes(readingArticle.id) : false}
        onToggleSave={(id) => handleToggleSave(id)}
        isLiked={readingArticle ? likedArticleIds.includes(readingArticle.id) : false}
        onToggleLike={(id) => handleToggleLike(id)}
      />

      <CommandDiscoveryOverlay
        isOpen={isDiscoveryOpen}
        initialFocus={discoveryInitialFocus}
        onClose={() => setIsDiscoveryOpen(false)}
        selectedCategoryId={selectedCategoryId}
        selectedSubcategoryId={selectedSubcategoryId}
        onSelectCategory={handleSelectCategory}
        onClearCategory={() => {
          setSelectedCategoryId(null)
          setSelectedSubcategoryId(null)
        }}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        articles={articles}
        onArticleClick={(article) => setReadingArticle(article)}
      />

      <AiChatWidget
        currentArticle={readingArticle}
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        onOpen={() => setIsAiChatOpen(true)}
      />

      <Footer
        language={language}
        onLanguageChange={setLanguage}
        onSelectCategory={handleSelectCategory}
        onNavigateHome={handleNavigateHome}
        onNavigateSaved={() => setIsSavedViewActive(true)}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
        onOpenPolicyModal={handleOpenPolicyModal}
      />

      <EditorialStandardsModal
        isOpen={policyModalOpen}
        initialTab={policyModalTab}
        onClose={() => setPolicyModalOpen(false)}
      />
    </div>
  )
}
