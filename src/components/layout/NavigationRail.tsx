import React from 'react'
import { Newspaper, MessageSquare, Palette, Globe, Plus } from 'lucide-react'

export type NavDestination = 'feed' | 'globe' | 'community' | 'comics'

export interface NavigationRailProps {
  activeDestination: NavDestination
  onSelectDestination: (destination: NavDestination) => void
  onOpenNewPost: () => void
  onNavigateHome?: () => void
  className?: string
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeDestination,
  onSelectDestination,
  onOpenNewPost,
  onNavigateHome,
  className = '',
}) => {
  const destinations = [
    {
      id: 'feed' as NavDestination,
      label: 'News Feed',
      icon: Newspaper,
      isActive: activeDestination === 'feed',
      onClick: () => {
        if (onNavigateHome) {
          onNavigateHome()
        } else {
          onSelectDestination('feed')
        }
      },
    },
    {
      id: 'globe' as NavDestination,
      label: 'News Globe',
      icon: Globe,
      isActive: activeDestination === 'globe',
      onClick: () => onSelectDestination('globe'),
    },
    {
      id: 'community' as NavDestination,
      label: 'Community',
      icon: MessageSquare,
      isActive: activeDestination === 'community',
      onClick: () => onSelectDestination('community'),
    },
    {
      id: 'comics' as NavDestination,
      label: 'Cartoons',
      icon: Palette,
      isActive: activeDestination === 'comics',
      onClick: () => onSelectDestination('comics'),
    },
  ]

  return (
    <aside className={`hidden h-fit w-14 shrink-0 md:block lg:w-40 xl:w-44 sticky top-20 z-30 ${className}`}>
      <nav
        aria-label="Publication Destination Navigation"
        className="w-full h-fit border-r border-[#E8E2D8] pr-2 lg:pr-3 xl:pr-4 flex flex-col justify-between select-none pt-0 pb-2 font-sans"
      >
      <div className="space-y-1">
        {destinations.map((dest) => {
          const Icon = dest.icon
          const active = dest.isActive

          return (
            <button
              key={dest.id}
              type="button"
              onClick={dest.onClick}
              aria-current={active ? 'page' : undefined}
              title={dest.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'text-white font-semibold bg-[#0F392B]'
                  : 'text-[#55504A] hover:text-[#141412] hover:bg-[#FAF7F2] font-medium'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 stroke-[2] ${
                  active ? 'text-white' : 'text-[#78716C]'
                }`}
              />
              <span className="hidden lg:inline truncate">{dest.label}</span>
            </button>
          )
        })}

        {activeDestination === 'community' && (
        <div className="pt-2.5 mt-2.5 border-t border-[#E8E2D8]">
          <button
            type="button"
            onClick={onOpenNewPost}
            title="Compose New Post"
            className="w-full py-2 px-2.5 bg-white hover:bg-[#FAF7F2] text-[#141412] hover:text-[#0F392B] rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#E8E2D8]"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2] text-[#0F392B]" />
            <span className="hidden lg:inline text-xs">New Post</span>
          </button>
        </div>
        )}
      </div>
    </nav>
    </aside>
  )
}
