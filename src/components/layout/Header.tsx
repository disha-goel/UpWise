import React, { useMemo } from 'react'
import { Bookmark } from 'lucide-react'
import { UpwiseLogo } from './UpwiseLogo'
import { SearchWithCategoryBrowser } from './SearchWithCategoryBrowser'
import { NotificationsPopover } from './NotificationsPopover'
import { AccountMenu } from './AccountMenu'
import { UserProfile } from '../../types/navigation'
import { LanguageSelector } from './LanguageSelector'
import { LanguageMode } from '../../types/news'
import { NavDestination } from './NavigationRail'

export interface HeaderProps {
  user: UserProfile | null
  language: LanguageMode
  onLanguageChange: (language: LanguageMode) => void
  selectedCategoryId: string | null
  selectedSubcategoryId: string | null
  onSelectCategory: (groupId: string, subcategoryId?: string) => void
  onSearch?: (query: string) => void
  searchQuery?: string
  onClearSearch?: () => void
  onOpenDiscovery?: (focus: 'search' | 'categories') => void
  onCloseDiscovery?: () => void
  isDiscoveryOpen?: boolean
  onLoginClick?: () => void
  onSignOutClick?: () => void
  onNavigateHome?: () => void
  onNavigateSaved?: () => void
  isSavedViewActive?: boolean
  savedCount?: number
  onNavigatePersonalize?: () => void
  activeDestination?: NavDestination
  onSelectDestination?: (dest: NavDestination) => void
  onOpenNewPost?: () => void
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  user,
  language,
  onLanguageChange,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSearch,
  searchQuery = '',
  onClearSearch,
  onOpenDiscovery,
  onCloseDiscovery,
  isDiscoveryOpen = false,
  onLoginClick,
  onSignOutClick,
  onNavigateHome,
  onNavigateSaved,
  isSavedViewActive = false,
  savedCount = 0,
  onNavigatePersonalize,
  activeDestination = 'feed',
  onSelectDestination,
  className = '',
}) => {
  return (
    <header className={`sticky top-0 z-40 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E2D8] shadow-xs text-[#141412] select-none font-sans transition-all ${className}`}>
      {/* Top Header Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap min-[360px]:flex-nowrap items-center justify-between min-h-14 py-2 min-[360px]:py-0 gap-1 sm:gap-6">
          
          {/* Left: Brand Wordmark */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectDestination?.('feed')
                onNavigateHome?.()
              }}
              className="group text-left focus:outline-none"
              aria-label="Upwise Hub Front Page"
            >
              <UpwiseLogo size="md" />
            </button>
          </div>

          {/* Right: Expandable Search, Saved, Account */}
          <div className="flex items-center gap-0.5 sm:gap-3 shrink-0 ml-auto">
            {/* Expandable Spotify-inspired Search Bar */}
            <SearchWithCategoryBrowser
              onSearch={onSearch}
              onCategorySelect={onSelectCategory}
              selectedCategoryId={selectedCategoryId}
              selectedSubcategoryId={selectedSubcategoryId}
              searchQuery={searchQuery}
              onClearSearch={onClearSearch}
              onOpenDiscovery={onOpenDiscovery}
              onCloseDiscovery={onCloseDiscovery}
              isDiscoveryOpen={isDiscoveryOpen}
            />

            <LanguageSelector language={language} onChange={onLanguageChange} />

            {/* Saved Button */}
            {onNavigateSaved && (
              <button
                type="button"
                onClick={onNavigateSaved}
                aria-label={isSavedViewActive ? 'Exit saved stories' : 'View saved stories'}
                title="Saved Stories"
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                  isSavedViewActive
                    ? 'bg-[#141412] text-white border-[#141412]'
                    : 'bg-white text-[#3A3732] hover:text-[#141412] hover:bg-[#FDFBF7] border-[#E8E2D8]'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 stroke-[1.75] ${isSavedViewActive ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">Saved</span>
                {savedCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#D95D39] text-white font-sans text-[10px] font-bold rounded-full min-w-4 text-center leading-4">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            <NotificationsPopover />

            <AccountMenu
              user={user}
              onLoginClick={onLoginClick}
              onSignOutClick={onSignOutClick}
              onNavigateSaved={onNavigateSaved}
              onNavigatePersonalize={onNavigatePersonalize}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
