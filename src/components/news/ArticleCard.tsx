import React, { useState } from 'react'
import { Bookmark, Clock, ExternalLink, Layers, Heart } from 'lucide-react'
import { Article, LanguageMode } from '../../types/news'

interface ArticleCardProps {
  article: Article
  language?: LanguageMode
  onArticleClick: (article: Article) => void
  isSaved?: boolean
  onToggleSave?: (articleId: string, e: React.MouseEvent) => void
  isLiked?: boolean
  onToggleLike?: (articleId: string, e: React.MouseEvent) => void
  variant?: 'standard' | 'compact' | 'featured'
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  language = 'en',
  onArticleClick,
  isSaved = false,
  onToggleSave,
  isLiked = false,
  onToggleLike,
  variant = 'standard',
}) => {
  const [imageError, setImageError] = useState(false)
  const isHindi = language === 'hi'
  const displayTitle = isHindi && article.titleHi ? article.titleHi : article.title
  const displaySummary = isHindi && article.summaryHi ? article.summaryHi : article.summary

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Compact variant for secondary lists / desks
  if (variant === 'compact') {
    return (
      <article
        onClick={() => onArticleClick(article)}
        className="group cursor-pointer py-4 border-b border-[#E8E2D8] last:border-b-0 flex gap-4 items-start select-none font-sans transition-colors"
        aria-label={displayTitle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D95D39] shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#141412]">
              {article.categoryName}
            </span>
          </div>

          <h3 className="font-serif font-bold text-sm sm:text-base text-[#141412] leading-[1.3] group-hover:text-[#0F392B] transition-colors line-clamp-2 mb-1.5">
            {displayTitle}
          </h3>

          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <span>{article.source.name}</span>
            <span className="text-[#D4CBBF]">•</span>
            <span>{article.readTime}</span>
          </div>
        </div>

        {article.imageUrl && !imageError ? (
          <div className="w-20 h-20 sm:w-24 sm:h-20 shrink-0 overflow-hidden rounded-md bg-[#FDFBF7] border border-[#E8E2D8]">
            <img
              src={article.imageUrl}
              alt=""
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>
        ) : null}
      </article>
    )
  }

  // Standard editorial card (used in 3-column "The stories shaping today" grid)
  return (
    <article
      onClick={() => onArticleClick(article)}
      className="group cursor-pointer flex flex-col justify-between h-full transition-colors select-none font-sans"
      aria-label={displayTitle}
    >
      <div>
        {/* Top Image: 16:9 ratio, subtle rounded corners, border */}
        {article.imageUrl && !imageError ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#FDFBF7] border border-[#E8E2D8] mb-3 group shadow-xs">
            <img
              src={article.imageUrl}
              alt={article.imageCaption || displayTitle}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-[#FDFBF7] rounded-lg border border-[#E8E2D8] mb-3 flex flex-col items-center justify-center text-[#78716C] p-4 text-center">
            <span className="text-xs font-semibold text-[#141412]">{article.source.name}</span>
          </div>
        )}

        {/* Category Eyebrow with Orange dot + Action buttons */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D95D39] shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#141412]">
              {article.categoryName}
            </span>
            {article.cluster && article.cluster.sourceCount > 1 && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0F392B]/10 text-[#0F392B] border border-[#0F392B]/20"
                title={`Multi-source story covered across ${article.cluster.sourceCount} verified newsrooms`}
              >
                <Layers className="w-2.5 h-2.5 stroke-[2]" />
                <span>{article.cluster.sourceCount} sources</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {article.originalUrl && (
              <a
                href={article.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleSourceClick}
                className="p-1 rounded text-[#78716C] hover:text-[#0F392B] transition-colors"
                title={`Source: ${article.source.name}`}
              >
                <ExternalLink className="w-3 h-3 stroke-[1.75]" />
              </a>
            )}
            {onToggleLike && (
              <button
                type="button"
                onClick={(e) => onToggleLike(article.id, e)}
                aria-label={isLiked ? 'Unlike story' : 'Like story'}
                title={isLiked ? 'Unlike Story' : 'Like Story'}
                className={`p-1 rounded transition-colors ${
                  isLiked ? 'text-[#D95D39] bg-[#FBF2EF]' : 'text-[#78716C] hover:text-[#141412] hover:bg-black/5'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 stroke-[1.75] ${isLiked ? 'fill-current text-[#D95D39]' : ''}`} />
              </button>
            )}
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => onToggleSave(article.id, e)}
                aria-label={isSaved ? 'Remove bookmark' : 'Bookmark story'}
                title={isSaved ? 'Story Bookmarked' : 'Bookmark Story'}
                className={`p-1 rounded transition-colors ${
                  isSaved ? 'text-[#D95D39] bg-[#FBF2EF]' : 'text-[#78716C] hover:text-[#141412] hover:bg-black/5'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 stroke-[1.75] ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Headline: Serif, Bold, 2-3 lines */}
        <h3 className="font-serif font-bold text-base sm:text-[17px] text-[#141412] leading-[1.3] group-hover:text-[#0F392B] transition-colors mb-2 line-clamp-2 tracking-tight">
          {displayTitle}
        </h3>
      </div>

      {/* Source + Read Time Metadata */}
      <div className="flex items-center gap-2 text-xs text-[#78716C] pt-1 mt-auto">
        <span className="font-medium text-[#55504A]">{article.source.name}</span>
        <span className="text-[#D4CBBF]">•</span>
        <span>{article.readTime}</span>
      </div>
    </article>
  )
}
