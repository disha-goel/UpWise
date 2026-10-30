import { LanguageSelector } from '../layout/LanguageSelector'
import React, { useState } from 'react'
import {
  Cpu,
  Landmark,
  TrendingUp,
  FlaskConical,
  Trophy,
  Globe,
  Palette,
  GraduationCap,
  Rocket,
  Check,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { UpwiseLogo } from '../layout/UpwiseLogo'
import { LanguageMode } from '../../types/news'
import { syncPreferencesApi } from '../../services/api'

export interface TopicDeskItem {
  id: string
  name: string
  description: string
  categoryKey: string
  icon: React.ComponentType<{ className?: string }>
}

export const ONBOARDING_DESKS: TopicDeskItem[] = [
  {
    id: 'tech-computing',
    name: 'Technology',
    description: 'Hardware, silicon architecture, computing systems, and cyber infrastructure.',
    categoryKey: 'tech-science',
    icon: Cpu,
  },
  {
    id: 'india-national',
    name: 'India & Politics',
    description: 'National governance, parliament, policy corridors, and civic administration.',
    categoryKey: 'india-politics',
    icon: Landmark,
  },
  {
    id: 'business-markets',
    name: 'Business & Markets',
    description: 'Equities, central bank policy, macroeconomics, and fiscal strategies.',
    categoryKey: 'business-economy',
    icon: TrendingUp,
  },
  {
    id: 'science-innovation',
    name: 'Science',
    description: 'Deep space exploration, quantum computing, and biomedical discovery.',
    categoryKey: 'tech-science',
    icon: FlaskConical,
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Cricket, international football, tennis, athletics, and motorsport.',
    categoryKey: 'sports',
    icon: Trophy,
  },
  {
    id: 'world-news',
    name: 'World News',
    description: 'Diplomatic summits, foreign affairs, and cross-border economic dispatches.',
    categoryKey: 'world-lifestyle',
    icon: Globe,
  },
  {
    id: 'entertainment-culture',
    name: 'Entertainment',
    description: 'Cinema, literature, architecture, cultural preservation, and creative arts.',
    categoryKey: 'world-lifestyle',
    icon: Palette,
  },
  {
    id: 'career-education',
    name: 'Career & Education',
    description: 'Workforce transformations, technical education, and professional development.',
    categoryKey: 'business-economy',
    icon: GraduationCap,
  },
  {
    id: 'startups-ai',
    name: 'AI & Startups',
    description: 'Frontier AI models, seed-to-growth venture rounds, and founder strategies.',
    categoryKey: 'tech-science',
    icon: Rocket,
  },
]

export type TopicItem = TopicDeskItem
export const ONBOARDING_TOPICS: TopicDeskItem[] = ONBOARDING_DESKS

export interface PersonalizeFeedOnboardingProps {
  initialTopics?: string[]
  initialLanguage?: LanguageMode
  userId?: string
  onComplete: (selectedTopicIds: string[], language: LanguageMode) => void
  onCancelEdit?: () => void
  isEditing?: boolean
}

export const PersonalizeFeedOnboarding: React.FC<PersonalizeFeedOnboardingProps> = ({
  initialTopics = [],
  initialLanguage = 'en',
  userId,
  onComplete,
  onCancelEdit,
  isEditing = false,
}) => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialTopics)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageMode>(initialLanguage)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedTopics(ONBOARDING_DESKS.map((d) => d.id))
  }

  const handleClearAll = () => {
    setSelectedTopics([])
  }

  const handleContinue = () => {
    if (selectedTopics.length === 0) {
      setSaveError('Please select at least one reporting desk to personalize your news feed.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      if (userId) {
        localStorage.setItem(`upwise_user_topics_${userId}`, JSON.stringify(selectedTopics))
        localStorage.setItem(`upwise_user_language_${userId}`, selectedLanguage)
        localStorage.setItem(`upwise_user_onboarding_completed_${userId}`, 'true')
        syncPreferencesApi({ topics: selectedTopics, language: selectedLanguage })
      }
      localStorage.setItem('upwise_user_language', selectedLanguage)
      localStorage.setItem('upwise_user_onboarding_completed', 'true')

      setIsSaving(false)
      onComplete(selectedTopics, selectedLanguage)
    } catch {
      setIsSaving(false)
      setSaveError('Unable to save preferences to local storage. Please check permissions and try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#141412] flex flex-col justify-between font-sans select-none">
      <header className="w-full border-b border-[#E8E2D8] bg-[#FAF7F2] px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-xs">
        <UpwiseLogo />
        <span className="text-xs font-semibold text-[#78716C] tracking-widest uppercase">
          {isEditing ? 'Desk Preferences' : 'Editorial Personalization'}
        </span>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="w-7 h-[3px] bg-[#D95D39] rounded-full mx-auto mb-3" />
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#141412] tracking-tight leading-tight mb-3">
            Select Your Reporting Desks
          </h1>
          <p className="text-xs sm:text-sm text-[#55504A] leading-relaxed">
            Choose the sections and language edition that define your daily newspaper feed.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-xs font-semibold text-[#78716C]">Reading language</span>
            <LanguageSelector language={selectedLanguage} onChange={setSelectedLanguage} label="Preferred reading language" compactOnMobile={false} />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-[#78716C]">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#E8E2D8] rounded-md shadow-xs">
              <strong className="text-[#141412]">{selectedTopics.length}</strong> of {ONBOARDING_DESKS.length} desks selected
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#0F392B] hover:underline font-semibold"
            >
              Select All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="hover:text-[#141412] hover:underline"
            >
              Clear All
            </button>
          </div>
        </div>

        {saveError && (
          <div className="max-w-xl mx-auto mb-6 p-3.5 bg-[#FBF2EF] border border-[#F3D5CC] rounded-lg flex items-center gap-2.5 text-xs text-[#D95D39] font-medium">
            <AlertCircle className="w-4 h-4 text-[#D95D39] shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Desks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-10">
          {ONBOARDING_DESKS.map((desk) => {
            const isSelected = selectedTopics.includes(desk.id)
            const IconComp = desk.icon

            return (
              <div
                key={desk.id}
                onClick={() => toggleTopic(desk.id)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    toggleTopic(desk.id)
                  }
                }}
                className={`group cursor-pointer rounded-xl p-4 border transition-all duration-150 select-none flex flex-col justify-between min-h-[130px] relative shadow-xs ${
                  isSelected
                    ? 'border-[#0F392B] bg-white ring-1 ring-[#0F392B]'
                    : 'border-[#E8E2D8] bg-[#FDFBF7] hover:border-[#D4CBBF] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`p-2 rounded-lg border ${
                      isSelected
                        ? 'bg-[#0F392B] text-white border-[#0F392B]'
                        : 'bg-white text-[#141412] border-[#E8E2D8]'
                    }`}>
                      <IconComp className="w-4 h-4 stroke-[1.75]" />
                    </span>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#0F392B] border-[#0F392B] text-white'
                          : 'border-[#E8E2D8] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <h2 className="font-serif font-bold text-base sm:text-lg tracking-tight leading-snug mb-1 text-[#141412]">
                    {desk.name}
                  </h2>
                  <p className="text-xs text-[#55504A] leading-relaxed">
                    {desk.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-6 border-t border-[#E8E2D8]">
          <button
            type="button"
            disabled={selectedTopics.length === 0 || isSaving}
            onClick={handleContinue}
            className="w-full sm:w-auto min-w-[240px] px-8 py-3 bg-[#0F392B] text-white hover:bg-[#184837] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>{isSaving ? 'Saving preferences...' : 'Continue to News Feed'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2]" />
          </button>

          {isEditing && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 text-xs font-semibold text-[#78716C] hover:text-[#141412] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-[#78716C] border-t border-[#E8E2D8] bg-[#FAF7F2]">
        © {new Date().getFullYear()} Upwise Hub • Independent student news & civic intelligence
      </footer>
    </div>
  )
}
