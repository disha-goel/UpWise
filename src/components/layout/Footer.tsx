import { LanguageSelector } from './LanguageSelector'
import React, { useState } from 'react'
import { ArrowUp, CheckCircle, Mail, Loader2, Volume2, Shield } from 'lucide-react'
import { SunLogo } from './SunLogo'
import { LanguageMode } from '../../types/news'
import { PolicyTab } from './EditorialStandardsModal'

interface FooterProps {
  language?: LanguageMode
  onLanguageChange?: (lang: LanguageMode) => void
  onSelectCategory?: (groupId: string, subcategoryId?: string) => void
  onNavigateHome?: () => void
  onNavigateSaved?: () => void
  reducedMotion?: boolean
  onToggleReducedMotion?: () => void
  onOpenPolicyModal?: (tab: PolicyTab) => void
}

export const Footer: React.FC<FooterProps> = ({
  language = 'en',
  onLanguageChange,
  onSelectCategory,
  onNavigateHome,
  onNavigateSaved,
  reducedMotion = false,
  onToggleReducedMotion,
  onOpenPolicyModal,
}) => {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('upwise_newsletter_subscriber') || null
    } catch {
      return null
    }
  })

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!trimmed) {
      setEmailError('Please enter your email address.')
      return
    }
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setEmailError(null)
    setIsSubmitting(true)

    setTimeout(() => {
      try {
        localStorage.setItem('upwise_newsletter_subscriber', trimmed)
      } catch {
        // Storage fallback
      }
      setIsSubmitting(false)
      setSubscribedEmail(trimmed)
      setEmail('')
    }, 500)
  }

  const handleResetSubscription = () => {
    try {
      localStorage.removeItem('upwise_newsletter_subscriber')
    } catch {
      // Storage fallback
    }
    setSubscribedEmail(null)
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-[#FAF7F2] border-t border-[#E8E2D8] mt-16 text-[#141412] transition-colors font-sans select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-[#E8E2D8]">
          
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="mb-3">
                <SunLogo onClick={onNavigateHome} />
              </div>
              <p className="font-serif text-base italic text-[#55504A] mb-3">
                News worth your attention.
              </p>
              <p className="text-xs text-[#78716C] leading-relaxed max-w-sm mb-6">
                Upwise Hub delivers objective student and civic news discovery across technology, policy, careers, and markets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenPolicyModal?.('charter')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-[#E8E2D8] text-[11px] font-medium text-[#141412] hover:border-[#D4CBBF] hover:bg-[#FAF7F2] transition-colors shadow-xs"
              >
                <Shield className="w-3 h-3 text-[#0F392B]" />
                <span>Editorial Charter</span>
              </button>

              <a
                href="mailto:newsroom@upwisehub.internal"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-[#E8E2D8] text-[11px] font-medium text-[#141412] hover:border-[#D4CBBF] hover:bg-[#FAF7F2] transition-colors shadow-xs"
              >
                <Mail className="w-3 h-3 text-[#78716C]" />
                <span>Newsroom Desk</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171715] mb-3">
              Editorial Sections
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#5C5852]">
              <li>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-[#C84B31] transition-colors text-left"
                >
                  Front Page & Top Stories
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('india-politics')}
                  className="hover:text-[#C84B31] transition-colors text-left"
                >
                  India & Politics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('tech-science')}
                  className="hover:text-[#C84B31] transition-colors text-left"
                >
                  Technology & Science
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('business-economy')}
                  className="hover:text-[#C84B31] transition-colors text-left"
                >
                  Business & Markets
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('sports')}
                  className="hover:text-[#C84B31] transition-colors text-left"
                >
                  Sports & Athletics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('world-lifestyle')}
                  className="hover:text-[#C84B31] transition-colors text-left"
                >
                  World News & Culture
                </button>
              </li>
              {onNavigateSaved && (
                <li className="pt-1 border-t border-[#E5E0D5]">
                  <button
                    type="button"
                    onClick={onNavigateSaved}
                    className="hover:text-[#B83214] transition-colors text-left font-semibold text-[#C84B31]"
                  >
                    Your Saved Stories
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171715] mb-3">
              Preferences
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#78716C] block mb-1.5">
                  Language Edition
                </label>
                <LanguageSelector language={language} onChange={(value) => onLanguageChange?.(value)} label="Footer reading language" compactOnMobile={false} />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#78716C] block mb-1.5">
                  Accessibility
                </label>
                <button
                  type="button"
                  onClick={onToggleReducedMotion}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-medium transition-all ${
                    reducedMotion
                      ? 'bg-[#FBF2EF] border-[#F0C9BF] text-[#C84B31] font-semibold'
                      : 'bg-white border-[#E5E0D5] text-[#5C5852] hover:bg-[#F5F1E8]'
                  }`}
                  aria-pressed={reducedMotion}
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#78716C]" />
                  <span>{reducedMotion ? 'Reduced Motion: ON' : 'Reduced Motion: OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171715] mb-1">
              Daily Briefing
            </h4>
            <p className="text-xs text-[#78716C] leading-relaxed mb-3">
              Curated student news briefing delivered directly to your inbox.
            </p>

            {subscribedEmail ? (
              <div className="p-3 bg-[#FBF2EF] border border-[#F0C9BF] rounded">
                <div className="flex items-start gap-2 mb-1.5">
                  <CheckCircle className="w-4 h-4 text-[#C84B31] shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-[#171715] leading-tight">
                    Subscribed ({subscribedEmail})
                  </p>
                </div>
                <p className="text-[11px] text-[#78716C] leading-relaxed mb-2">
                  Request recorded in your reader session for morning dispatches.
                </p>
                <button
                  type="button"
                  onClick={handleResetSubscription}
                  className="text-[11px] text-[#C84B31] underline font-semibold hover:text-[#B83214]"
                >
                  Change email address
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError(null)
                    }}
                    placeholder="Enter your email"
                    aria-label="Email address for morning newspaper edition"
                    className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded text-xs text-[#141412] placeholder:text-[#78716C] focus:outline-none focus:ring-1 focus:ring-[#0F392B] focus:border-[#0F392B] transition-all shadow-xs"
                  />
                </div>

                {emailError && (
                  <p className="text-[11px] text-[#D95D39] font-medium">{emailError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 px-4 bg-[#0F392B] hover:bg-[#184837] disabled:opacity-70 text-white rounded text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Subscribe to Morning Edition</span>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
            <span>© {currentYear} Upwise Hub • Independent Digital Newspaper</span>
            <span className="hidden sm:inline text-[#D4CDBF]">•</span>
            <button
              type="button"
              onClick={() => onOpenPolicyModal?.('privacy')}
              className="hover:text-[#171715] transition-colors underline underline-offset-2"
            >
              Privacy Policy
            </button>
            <span className="hidden sm:inline text-[#D4CDBF]">•</span>
            <button
              type="button"
              onClick={() => onOpenPolicyModal?.('terms')}
              className="hover:text-[#171715] transition-colors underline underline-offset-2"
            >
              Editorial Standards
            </button>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#171715] hover:text-[#C84B31] transition-colors px-3 py-1.5 rounded border border-[#E5E0D5] bg-white hover:bg-[#F5F1E8] shadow-xs"
            aria-label="Back to top of newspaper"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  )
}
