import React, { useState } from 'react'
import { Bookmark, Clock, ArrowRight, ExternalLink, MapPin, Heart } from 'lucide-react'
import { Article, LanguageMode } from '../../types/news'

interface LeadStoryProps {
  article: Article
  language?: LanguageMode
  onArticleClick: (article: Article) => void
  isSaved?: boolean
  onToggleSave?: (articleId: string, e: React.MouseEvent) => void
  isLiked?: boolean
  onToggleLike?: (articleId: string, e: React.MouseEvent) => void
}

export const LeadStory: React.FC<LeadStoryProps> = ({
  article,
  language = 'en',
  onArticleClick,
  isSaved = false,
  onToggleSave,
  isLiked = false,
  onToggleLike,
}) => {
  const [imageError, setImageError] = useState(false)
  const isHindi = language === 'hi'
  const displayTitle = isHindi && article.titleHi ? article.titleHi : article.title
  const displayDeck = isHindi && article.deckHi ? article.deckHi : article.deck

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Location / photo credit for overlay badge
  const locationTag = article.imageCaption
    ? article.imageCaption.replace(/\.$/, '')
    : 'Indian Railways / New Delhi'

  return (
    <article
      onClick={() => onArticleClick(article)}
      className="group cursor-pointer pb-8 mb-8 border-b border-[#E8E2D8] transition-colors select-none font-sans"
      aria-label={`Lead Story: ${displayTitle}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Eyebrow, Large Headline, Deck, Bullets, Author & Explore Button */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            {/* Category Eyebrow with Orange Dot */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D95D39] shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#141412] font-sans">
                {article.categoryName || 'India & Politics'}
              </span>
            </div>

            {/* Major Editorial Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#141412] leading-[1.12] tracking-tight mb-4 group-hover:text-[#0D0D0B] transition-colors">
              {displayTitle}
            </h1>

            {/* Deck / Subtitle */}
            {displayDeck && (
              <p className="font-sans text-sm sm:text-base text-[#55504A] leading-relaxed mb-5 font-normal">
                {displayDeck}
              </p>
            )}

            {/* Key Takeaways / Bullets */}
            {article.keyTakeaways && article.keyTakeaways.length > 0 ? (
              <div className="mb-6 space-y-2">
                {article.keyTakeaways.slice(0, 2).map((takeaway, idx) => (
                  <p key={idx} className="text-xs sm:text-[13px] text-[#4A4640] leading-snug flex items-start gap-2">
                    <span className="text-[#0F392B] font-bold mt-0.5">•</span>
                    <span>{takeaway}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="mb-6 space-y-2">
                <p className="text-xs sm:text-[13px] text-[#4A4640] leading-snug flex items-start gap-2">
                  <span className="text-[#0F392B] font-bold mt-0.5">•</span>
                  <span>A more informed you builds a stronger, more resilient India.</span>
                </p>
                <p className="text-xs sm:text-[13px] text-[#4A4640] leading-snug flex items-start gap-2">
                  <span className="text-[#0F392B] font-bold mt-0.5">•</span>
                  <span>Stay updated. Stay aware. Be part of the conversation.</span>
                </p>
              </div>
            )}
          </div>

          {/* Author metadata and Forest Green Explore Button */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#E8E2D8]/80 flex-wrap">
            <div className="flex items-center gap-2.5 text-xs text-[#78716C]">
              {/* Author Avatar */}
              <div className="w-7 h-7 rounded-full bg-[#0F392B] text-white flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden">
                {article.author.name.charAt(0)}
              </div>
              <span className="font-semibold text-[#141412]">By {article.author.name}</span>
              <span className="text-[#D4CBBF]">•</span>
              <span className="inline-flex items-center gap-1 text-[#78716C]">
                <Clock className="w-3 h-3 stroke-[1.75]" />
                {article.readTime}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onToggleLike && (
                <button
                  type="button"
                  onClick={(e) => onToggleLike(article.id, e)}
                  aria-label={isLiked ? 'Unlike story' : 'Like story'}
                  title={isLiked ? 'Unlike Story' : 'Like Story'}
                  className={`p-2 rounded-full border transition-all ${
                    isLiked
                      ? 'text-[#D95D39] bg-[#FBF2EF] border-[#F3D5CC]'
                      : 'text-[#78716C] hover:text-[#141412] bg-white hover:bg-[#FAF7F2] border-[#E8E2D8]'
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
                  className={`p-2 rounded-full border transition-all ${
                    isSaved
                      ? 'text-[#D95D39] bg-[#FBF2EF] border-[#F3D5CC]'
                      : 'text-[#78716C] hover:text-[#141412] bg-white hover:bg-[#FAF7F2] border-[#E8E2D8]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 stroke-[1.75] ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}

              {/* Deep Forest-Green Explore Button */}
              <button
                type="button"
                onClick={() => onArticleClick(article)}
                className="bg-[#0F392B] hover:bg-[#184837] text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Explore top stories</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Prominent Lead Image with Location Overlay */}
        <div className="lg:col-span-6">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#FDFBF7] border border-[#E8E2D8] shadow-sm group">
            {article.imageUrl && !imageError ? (
              <img
                src={article.imageUrl}
                alt={article.imageCaption || displayTitle}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#78716C]">
                <p className="text-sm font-semibold text-[#141412]">{article.source.name}</p>
                <p className="text-xs text-[#78716C] mt-1">{article.categoryName}</p>
              </div>
            )}

            {/* Translucent location / credit badge in bottom-right */}
            <div className="absolute bottom-3 right-3 bg-black/65 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <MapPin className="w-3 h-3 text-[#F09D7A]" />
              <span className="truncate max-w-[200px] sm:max-w-[260px]">{locationTag}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
