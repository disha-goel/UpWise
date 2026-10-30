import React, { useEffect, useState } from 'react'
import {
  X,
  Bookmark,
  Share2,
  Clock,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Newspaper,
  Layers,
  Heart,
} from 'lucide-react'
import { Article, LanguageMode } from '../../types/news'

interface ArticleReaderPanelProps {
  article: Article | null
  language?: LanguageMode
  onClose: () => void
  isSaved?: boolean
  onToggleSave?: (articleId: string) => void
  isLiked?: boolean
  onToggleLike?: (articleId: string) => void
}

export const ArticleReaderPanel: React.FC<ArticleReaderPanelProps> = ({
  article,
  language = 'en',
  onClose,
  isSaved = false,
  onToggleSave,
  isLiked = false,
  onToggleLike,
}) => {
  const [imageError, setImageError] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setImageError(false)
    setCopied(false)
  }, [article])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (article) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [article, onClose])

  if (!article) return null

  const isHindi = language === 'hi'
  const displayTitle = isHindi && article.titleHi ? article.titleHi : article.title
  const displayDeck = isHindi && article.deckHi ? article.deckHi : article.deck
  const displayContent = isHindi && article.contentHi ? article.contentHi : article.content
  const displayTakeaways = isHindi && article.keyTakeawaysHi ? article.keyTakeawaysHi : article.keyTakeaways
  const isTranslationAvailable = !isHindi || Boolean(article.contentHi || article.summaryHi)

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(article.originalUrl || window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-150 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#141412]/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Centered Editorial Reading Panel */}
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white border border-[#E8E2D8] rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
        
        {/* Header with Back to BroadSheet and Actions */}
        <header className="h-14 px-4 sm:px-6 border-b border-[#E8E2D8] flex items-center justify-between bg-[#FAF7F2] shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#141412] hover:bg-white border border-[#E8E2D8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
              <span>Back to Feed</span>
            </button>

            <span className="w-px h-4 bg-[#E8E2D8]" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D95D39] truncate max-w-[120px]">
                {article.categoryName}
              </span>
              <span className="text-xs text-[#78716C] truncate max-w-[140px] hidden sm:inline">
                {article.source.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleLike && (
              <button
                type="button"
                onClick={() => onToggleLike(article.id)}
                className={`p-1.5 rounded-md hover:bg-white border transition-colors flex items-center gap-1.5 text-xs font-medium ${
                  isLiked
                    ? 'text-[#D95D39] bg-[#FBF2EF] border-[#F3D5CC]'
                    : 'text-[#55504A] hover:text-[#141412] border-[#E8E2D8]'
                }`}
                aria-label={isLiked ? 'Unlike story' : 'Like story'}
              >
                <Heart className={`w-3.5 h-3.5 stroke-[1.75] ${isLiked ? 'fill-current text-[#D95D39]' : ''}`} />
                <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
              </button>
            )}

            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(article.id)}
                className={`p-1.5 rounded-md hover:bg-white border transition-colors flex items-center gap-1.5 text-xs font-medium ${
                  isSaved
                    ? 'text-[#D95D39] bg-[#FBF2EF] border-[#F3D5CC]'
                    : 'text-[#55504A] hover:text-[#141412] border-[#E8E2D8]'
                }`}
                aria-label={isSaved ? 'Remove bookmark' : 'Bookmark story'}
              >
                <Bookmark className={`w-3.5 h-3.5 stroke-[1.75] ${isSaved ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-md hover:bg-white border border-[#E8E2D8] text-[#55504A] hover:text-[#141412] transition-colors text-xs font-medium flex items-center gap-1.5"
              aria-label="Share article link"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[1.75]" />
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>

            <span className="w-px h-4 bg-[#E8E2D8] mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white text-[#78716C] hover:text-[#141412] transition-colors flex items-center gap-1"
              aria-label="Close reading view"
            >
              <X className="w-4 h-4 stroke-[2]" />
              <span className="hidden sm:inline font-mono text-[9px] text-[#78716C]">ESC</span>
            </button>
          </div>
        </header>

        {/* Scrollable Reading Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-10 bg-white">
          <div className="max-w-2xl mx-auto">
            
            {/* Publisher Attribution Banner */}
            <div className="mb-6 p-3 bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg flex items-center justify-between gap-3 text-xs">
              <span className="text-[#55504A] leading-tight">
                Curated dispatch by Upwise Hub • Published by <strong className="font-semibold text-[#141412]">{article.source.name}</strong>
              </span>
              {article.originalUrl && (
                <a
                  href={article.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F392B] hover:text-[#184837] shrink-0 transition-colors"
                >
                  <span>Original Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {!isTranslationAvailable && (
              <div className="mb-4 p-2.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg text-xs text-[#92400E]">
                Hindi translation is unavailable for this story. Displaying verified English dispatch.
              </div>
            )}

            {/* Expressive Editorial Headline */}
            <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-[#141412] leading-[1.2] mb-4 tracking-tight">
              {displayTitle}
            </h1>

            {displayDeck && (
              <p className="text-base sm:text-lg text-[#55504A] leading-relaxed mb-6 font-normal">
                {displayDeck}
              </p>
            )}

            {/* Author & Timestamp Metadata */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E8E2D8] text-xs text-[#78716C]">
              <div>
                <p className="font-semibold text-[#141412]">{article.author.name}</p>
                {article.author.role && (
                  <p className="text-[11px] text-[#78716C]">{article.author.role}</p>
                )}
              </div>
              <div className="text-right">
                <p>{article.publishedAt}</p>
                <p className="inline-flex items-center gap-1 text-[11px] text-[#78716C]">
                  <Clock className="w-3 h-3 text-[#78716C]" />
                  {article.readTime}
                </p>
              </div>
            </div>

            {/* Main Thumbnail with Fallback */}
            {article.imageUrl && !imageError ? (
              <figure className="mb-8">
                <div className="aspect-[16/10] overflow-hidden rounded-lg border border-[#E8E2D8] bg-[#FAF7F2]">
                  <img
                    src={article.imageUrl}
                    alt={article.imageCaption || displayTitle}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
                {article.imageCaption && (
                  <figcaption className="text-xs text-[#78716C] font-serif italic mt-2 leading-relaxed">
                    {article.imageCaption}
                  </figcaption>
                )}
              </figure>
            ) : (
              <div className="aspect-[21/9] bg-[#FAF7F2] rounded-lg border border-[#E8E2D8] mb-6 flex items-center justify-center gap-2 text-[#78716C]">
                <Newspaper className="w-5 h-5 stroke-[1.5]" />
                <span className="text-xs text-[#141412] font-semibold">{article.source.name}</span>
              </div>
            )}

            {/* Essential Takeaways (if available) */}
            {displayTakeaways && displayTakeaways.length > 0 && (
              <div className="mb-8 p-4 sm:p-5 bg-[#FAF7F2] border-l-4 border-[#0F392B] border-y border-r border-[#E8E2D8] rounded-r-lg">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141412] mb-2.5">
                  Essential Takeaways
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-[#55504A]">
                  {displayTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F392B] shrink-0 mt-0.5 stroke-[2]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Left-Aligned Body Content */}
            {displayContent && displayContent.length > 0 ? (
              <div className="space-y-5 text-base sm:text-[17px] text-[#141412] leading-[1.7] font-sans">
                {displayContent.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-base sm:text-[17px] text-[#141412] leading-[1.7]">
                  {article.summary}
                </p>
                {article.originalUrl && (
                  <div className="pt-4">
                    <a
                      href={article.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F392B] hover:bg-[#184837] text-white rounded-md text-xs font-semibold transition-colors shadow-xs"
                    >
                      <span>Read full story at {article.source.name}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Cross-Publisher Coverage (Real Story Clustering) */}
            {article.cluster && article.cluster.members.length > 1 && (
              <div className="mt-8 p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E2D8]">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-[#0F392B]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#141412]">
                    Cross-Publisher Coverage ({article.cluster.sourceCount} Newsrooms)
                  </h4>
                </div>
                <p className="text-xs text-[#78716C] mb-3">
                  This story has been independently covered across verified publishers:
                </p>
                <div className="space-y-2">
                  {article.cluster.members.map((member) => (
                    <a
                      key={member.id}
                      href={member.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded bg-white border border-[#E8E2D8] hover:border-[#0F392B] transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-semibold text-[#141412] group-hover:text-[#0F392B] truncate block">
                          {member.title}
                        </span>
                        <span className="text-[10px] text-[#78716C]">{member.publisher}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#78716C] group-hover:text-[#0F392B] shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="mt-12 pt-6 border-t border-[#E8E2D8] flex items-center justify-between text-xs text-[#78716C]">
              <span>Original reporting from {article.source.name}</span>
              <button
                type="button"
                onClick={onClose}
                className="text-[#141412] hover:text-[#0F392B] font-semibold transition-colors"
              >
                Back to Feed
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
