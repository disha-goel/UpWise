import React, { useState } from 'react'
import { ArrowUpRight, Bookmark, CheckCircle2, MapPin, Newspaper, Share2, Layers, Heart } from 'lucide-react'
import { Article, LanguageMode } from '../../types/news'
import { formatPublicationDate } from '../../utils/dateUtils'

interface SocialFeedCardProps {
  article: Article
  language: LanguageMode
  compact?: boolean
  isSaved: boolean
  isLiked?: boolean
  onArticleClick: (article: Article) => void
  onToggleSave?: (articleId: string, event: React.MouseEvent) => void
  onToggleLike?: (articleId: string, event: React.MouseEvent) => void
  onShare?: (article: Article, event: React.MouseEvent) => void
}

export const SocialFeedCard: React.FC<SocialFeedCardProps> = ({
  article, language, compact = false, isSaved, isLiked = false,
  onArticleClick, onToggleSave, onToggleLike, onShare,
}) => {
  const [imageError, setImageError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isHindi = language === 'hi'
  const title = isHindi && article.titleHi ? article.titleHi : article.title
  const summary = isHindi && article.summaryHi ? article.summaryHi : article.summary
  const date = Number.isNaN(Date.parse(article.publishedAt)) ? article.publishedAt : formatPublicationDate(article.publishedAt)
  const location = article.location?.city || article.location?.state || article.location?.country
  const longSummary = summary.length > 170
  const shownSummary = longSummary && !expanded ? `${summary.slice(0, 170).replace(/\s+\S*$/, '')}…` : summary

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8E2D8] bg-white shadow-xs" aria-label={title}>
      <div className="px-4 py-4 sm:px-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-wide">
          <span className="text-[#A7492F]">{article.categoryName}</span>
          {article.isTrending && <><span className="text-[#D4CBBF]" aria-hidden="true">/</span><span className="text-[#78716C]">IN FOCUS</span></>}
        </div>
        <h2 className="font-serif text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#141412] sm:text-[26px]">
          <button type="button" onClick={() => onArticleClick(article)} className="text-left transition-colors hover:text-[#0F392B] focus-visible:underline">{title}</button>
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#78716C]">
          <span className="inline-flex items-center gap-1 font-semibold text-[#55504A]">
            {article.source.name}
            {article.source.verified && <CheckCircle2 className="h-3 w-3 text-[#0F392B]" aria-label="Verified publisher" />}
          </span>
          <span>{date}</span>
          <span>{article.readTime}</span>
        </div>
        <p className="mt-3 text-[13px] leading-[1.8] text-[#625D55] sm:text-sm" lang={isHindi && article.summaryHi ? 'hi' : 'en'}>
          {shownSummary}{' '}
          {longSummary && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="font-semibold text-[#141412] hover:text-[#0F392B]">{expanded ? 'Show less' : 'more'}</button>}
        </p>
        {isHindi && !article.titleHi && <p className="mt-2 text-[10px] text-[#78716C]">English edition · Hindi translation unavailable</p>}
      </div>

      <button type="button" onClick={() => onArticleClick(article)} aria-label={`Read story: ${title}`} className={`group relative block w-full overflow-hidden bg-[#F1F0EB] ${compact ? 'aspect-[2.4/1]' : 'aspect-[16/10]'}`}>
        {article.imageUrl && !imageError ? <img src={article.imageUrl} alt={article.imageCaption || title} onError={() => setImageError(true)} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" /> : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[#8A8B7F]"><Newspaper className="h-10 w-10 stroke-1" /><span className="font-serif text-xl text-[#0F392B]">{article.source.name}</span></div>
        )}
        {location && <span className="absolute bottom-3 left-3 inline-flex max-w-[80%] items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium text-[#393C31] shadow-xs"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{location}</span></span>}
        <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#0F392B] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true"><ArrowUpRight className="h-4 w-4" /></span>
      </button>

      <div className="px-4 sm:px-5">
        <div className="flex items-center justify-between gap-3 border-b border-[#F0ECE5] py-3">
          <button type="button" onClick={() => onArticleClick(article)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F392B] hover:underline">Read full story <ArrowUpRight className="h-3.5 w-3.5" /></button>
          {article.cluster && article.cluster.sourceCount > 1 ? <span className="inline-flex items-center gap-1.5 text-[10px] text-[#78716C]"><Layers className="h-3 w-3" />{article.cluster.sourceCount} sources</span> : article.originalUrl && <a href={article.originalUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#78716C] hover:text-[#0F392B] hover:underline">Original source ↗</a>}
        </div>
        <div className="flex items-center justify-end gap-1 py-1">
          {onToggleLike && (
            <button
              type="button"
              onClick={(event) => onToggleLike(article.id, event)}
              aria-pressed={isLiked}
              aria-label={`${isLiked ? 'Unlike' : 'Like'} story: ${title}`}
              title={isLiked ? 'Unlike story' : 'Like story'}
              className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[#FAF7F2] ${
                isLiked ? 'text-[#D95D39]' : 'text-[#68645D]'
              }`}
            >
              <Heart className={`h-[18px] w-[18px] stroke-[1.7] ${isLiked ? 'fill-current text-[#D95D39]' : ''}`} aria-hidden="true" />
            </button>
          )}
          {onShare && <button type="button" onClick={(event) => onShare(article, event)} aria-label={`Share story: ${title}`} title="Share story" className="flex h-11 w-11 items-center justify-center rounded-lg text-[#68645D] transition-colors hover:bg-[#FAF7F2]"><Share2 className="h-[18px] w-[18px] stroke-[1.7]" aria-hidden="true" /></button>}
          {onToggleSave && <button type="button" onClick={(event) => onToggleSave(article.id, event)} aria-pressed={isSaved} aria-label={`${isSaved ? 'Unsave' : 'Save'} story: ${title}`} title={isSaved ? 'Unsave story' : 'Save story'} className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[#FAF7F2] ${isSaved ? 'text-[#0F392B]' : 'text-[#68645D]'}`}><Bookmark className={`h-[18px] w-[18px] stroke-[1.7] ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" /></button>}
        </div>
      </div>
    </article>
  )
}
