import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  ThumbsUp,
  Share2,
  ExternalLink,
  Plus,
  X,
  Filter,
  CheckCircle2,
  Send,
  CornerDownRight,
  Bookmark,
  Flag,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  MapPin,
  Search,
} from 'lucide-react'
import { UserProfile } from '../../types/navigation'
import {
  fetchCommunityPostsApi,
  createCommunityPostApi,
  togglePostReactionApi,
  addCommentApi,
  reportCommunityPostApi,
  moderateCommunityPostApi,
} from '../../services/api'
import {
  CommunityComment,
  CommunityPost,
  COMMUNITY_CATEGORIES,
  SEED_COMMUNITY_POSTS as SEED_POSTS,
} from '../../data/communityData'
export type { CommunityComment, CommunityPost }

interface CommunityHubProps {
  currentUser: UserProfile | null
  openComposerDirectly?: boolean
  onComposerClosed?: () => void
  onRequireLogin?: () => void
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  currentUser,
  openComposerDirectly = false,
  onComposerClosed,
  onRequireLogin,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const stored = localStorage.getItem('upwise_community_posts')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Storage fallback
    }
    return SEED_POSTS
  })

  const [votedPostIds, setVotedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('upwise_community_voted_post_ids')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('upwise_community_saved_post_ids')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [selectedCategory, setSelectedCategory] = useState<string>('All Dispatches')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isComposerOpen, setIsComposerOpen] = useState(openComposerDirectly)
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({})
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [titleInput, setTitleInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('Infrastructure & Economy')
  const [cityInput, setCityInput] = useState('New Delhi')
  const [contentInput, setContentInput] = useState('')
  const [sourceLinkInput, setSourceLinkInput] = useState('')
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [isSubmittingPost, setIsSubmittingPost] = useState(false)
  const [composerErrors, setComposerErrors] = useState<{ title?: string; content?: string; disclaimer?: string; city?: string; source?: string }>({})

  // Reporting & Moderation State
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<string>('Factually Inaccurate / Misleading Claims')
  const [reportDetails, setReportDetails] = useState<string>('')
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false)

  // Authorized Reviewer / Staff Verification Flag
  const isReviewer = currentUser?.role === 'reviewer' || currentUser?.role === 'admin'

  useEffect(() => {
    if (openComposerDirectly) {
      setIsComposerOpen(true)
    }
  }, [openComposerDirectly])

  useEffect(() => {
    let isCurrent = true
    fetchCommunityPostsApi({})
      .then((res) => {
        if (!isCurrent || !res?.data) return
        setPosts(res.data)
      })
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [])

  const handleCloseComposer = () => {
    setIsComposerOpen(false)
    setComposerErrors({})
    onComposerClosed?.()
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      onRequireLogin?.()
      return
    }

    const errors: { title?: string; content?: string; disclaimer?: string; city?: string; source?: string } = {}
    if (!titleInput.trim() || titleInput.trim().length < 6) {
      errors.title = 'Headline must be at least 6 characters.'
    }
    if (!contentInput.trim() || contentInput.trim().length < 20) {
      errors.content = 'Dispatch body must be at least 20 characters.'
    }
    if (cityInput.trim().length < 2) errors.city = 'Please enter the reporting city or campus.'
    if (!sourceLinkInput.trim()) errors.source = 'Please provide a source link for editorial verification.'
    if (!disclaimerAgreed) {
      errors.disclaimer = 'You must acknowledge the verification disclaimer.'
    }

    if (Object.keys(errors).length > 0) {
      setComposerErrors(errors)
      return
    }

    setIsSubmittingPost(true)
    try {
      const created = await createCommunityPostApi({
        title: titleInput.trim(),
        description: contentInput.trim(),
        city: cityInput.trim(),
        category: categoryInput,
        sourceUrl: sourceLinkInput.trim() || undefined,
        disclaimerAgreed: true,
      })

      setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)])
      setTitleInput('')
      setContentInput('')
      setSourceLinkInput('')
      setDisclaimerAgreed(false)
      setIsComposerOpen(false)
      onComposerClosed?.()

      setNoticeMessage('Your dispatch has been submitted for editorial review.')
    } catch (err: any) {
      setComposerErrors({ content: err.message || 'Failed to publish dispatch' })
    } finally {
      setIsSubmittingPost(false)
      setTimeout(() => setNoticeMessage(null), 3000)
    }
  }

  const [pendingVotes, setPendingVotes] = useState<string[]>([])
  const votingPosts = React.useRef(new Set<string>())
  const handleToggleUpvote = async (postId: string) => {
    if (!currentUser) {
      setNoticeMessage('Please sign in to upvote community dispatches.')
      onRequireLogin?.()
      return
    }
    if (votingPosts.current.has(postId)) return
    votingPosts.current.add(postId)
    setPendingVotes((prev) => [...prev, postId])
    try {
      const result = await togglePostReactionApi(postId)
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...result } : p))
      setVotedPostIds((prev) => {
        const next = result.hasUpvoted ? [...prev.filter((id) => id !== postId), postId] : prev.filter((id) => id !== postId)
        try { localStorage.setItem('upwise_community_voted_post_ids', JSON.stringify(next)) } catch { /* Storage unavailable */ }
        return next
      })
    } catch (err) {
      setNoticeMessage(err instanceof Error ? err.message : 'Unable to save vote')
    } finally {
      votingPosts.current.delete(postId)
      setPendingVotes((prev) => prev.filter((id) => id !== postId))
    }
  }

  const handleOpenReport = (postId: string) => {
    setReportingPostId(postId)
    setReportReason('Factually Inaccurate / Misleading Claims')
    setReportDetails('')
  }

  const handleConfirmReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportingPostId) return

    setIsSubmittingReport(true)
    try {
      const res = await reportCommunityPostApi(reportingPostId, reportReason, reportDetails)
      setNoticeMessage(res.message)
      if (!res.success) return
      setReportingPostId(null)
      setReportDetails('')
    } catch (err: any) {
      setNoticeMessage(err.message || 'Failed to submit report')
    } finally {
      setIsSubmittingReport(false)
      setTimeout(() => setNoticeMessage(null), 3000)
    }
  }

  const handleModerate = async (
    postId: string,
    status: 'approved' | 'rejected',
    verificationLevel?: 'unverified' | 'verified'
  ) => {
    if (!isReviewer) {
      setNoticeMessage('Unauthorized. Only editorial reviewers can moderate posts.')
      setTimeout(() => setNoticeMessage(null), 2500)
      return
    }

    try {
      const res = await moderateCommunityPostApi(postId, status, verificationLevel)
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, status, ...(verificationLevel ? { verificationLevel } : {}) }
              : p
          )
        )
        setNoticeMessage(res.message)
      } else {
        setNoticeMessage(res.message || 'Moderation rejected')
      }
    } catch (err: any) {
      setNoticeMessage(err.message || 'Moderation error')
    } finally {
      setTimeout(() => setNoticeMessage(null), 3000)
    }
  }

  const handleToggleSavePost = (postId: string) => {
    if (!currentUser) {
      setNoticeMessage('Please sign in to save community dispatches.')
      onRequireLogin?.()
      return
    }
    const isSaved = savedPostIds.includes(postId)
    const newSaved = isSaved
      ? savedPostIds.filter((id) => id !== postId)
      : [...savedPostIds, postId]

    setSavedPostIds(newSaved)
    try {
      localStorage.setItem('upwise_community_saved_post_ids', JSON.stringify(newSaved))
    } catch {
      // Storage fallback
    }
  }

  const commentingPosts = React.useRef(new Set<string>())
  const handleAddComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setNoticeMessage('Please sign in to reply to dispatches.')
      onRequireLogin?.()
      return
    }
    const text = commentInput[postId]?.trim()
    if (!text || commentingPosts.current.has(postId)) return
    commentingPosts.current.add(postId)
    try {
      const comment = await addCommentApi(postId, text)
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p))
      setCommentInput((prev) => ({ ...prev, [postId]: '' }))
    } catch (err) {
      setNoticeMessage(err instanceof Error ? err.message : 'Unable to save comment')
    } finally {
      commentingPosts.current.delete(postId)
    }
  }

  const filteredPosts = posts.filter((post) => {
    if (selectedCategory !== 'All Dispatches' && post.category !== selectedCategory) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="mx-auto w-full max-w-[760px] font-sans pb-12 pt-1 sm:pt-2">
      {noticeMessage && (
        <div className="mb-4 px-4 py-2.5 bg-[#141412] text-[#FAF7F2] border border-[#E8E2D8]/40 rounded-xl flex items-center justify-between text-xs font-semibold shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D95D39] shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-[#D4CBBF] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Community Section Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B857A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D95D39]" /> Reader Forum & Commentary
          </div>
          <h1 className="font-serif text-[28px] sm:text-[32px] font-semibold leading-tight tracking-tight text-[#141412]">
            Community Dispatches
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-[#78716C]">
            Independent reader perspectives, civic analyses, and verified commentary on today's reporting.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              onRequireLogin?.()
              return
            }
            setIsComposerOpen(true)
          }}
          className="self-start sm:self-auto rounded-full bg-[#0F392B] hover:bg-[#184837] text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Write Dispatch</span>
        </button>
      </div>

      {/* Quick Category Chips & Search Bar */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-[#E8E2D8] bg-white p-3 sm:p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap" aria-label="Community categories">
            {COMMUNITY_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[#0F392B] bg-[#0F392B] text-white shadow-xs'
                      : 'border-[#E8E2D8] text-[#78716C] hover:border-[#0F392B] hover:text-[#0F392B]'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          <div className="relative shrink-0 w-full sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dispatches..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#FAF7F2] border border-[#E8E2D8] rounded-full text-[#141412] placeholder:text-[#78716C] focus:outline-none focus:border-[#0F392B] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Composer Form */}
      {isComposerOpen && (
        <div className="mb-6 p-5 sm:p-6 bg-white border border-[#E8E2D8] rounded-2xl shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0ECE5] mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D95D39]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D95D39]" /> Citizen Reporting Desk
              </div>
              <h2 className="font-serif text-xl font-bold text-[#141412] mt-0.5">
                Compose Dispatch
              </h2>
              <p className="text-xs text-[#78716C]">
                Publishing as <strong className="text-[#141412] font-semibold">{currentUser?.name || 'Reader Correspondent'}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseComposer}
              className="p-1.5 rounded-lg text-[#78716C] hover:text-[#141412] hover:bg-[#FAF7F2] transition-colors"
              aria-label="Close composer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label
                htmlFor="dispatch-title"
                className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5"
              >
                Dispatch Headline
              </label>
              <input
                id="dispatch-title"
                type="text"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value)
                  if (composerErrors.title) {
                    setComposerErrors((prev) => ({ ...prev, title: undefined }))
                  }
                }}
                placeholder="e.g. Analysis: Regional power grid adaptations following solar expansion"
                className={`w-full px-3.5 h-10 text-sm bg-[#FAF7F2] border rounded-xl text-[#141412] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#0F392B] focus:ring-1 focus:ring-[#0F392B] transition-all ${
                  composerErrors.title ? 'border-[#B91C1C]' : 'border-[#E8E2D8]'
                }`}
              />
              {composerErrors.title && (
                <p className="mt-1 text-xs text-[#B91C1C] font-medium">
                  {composerErrors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="dispatch-category"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5"
                >
                  Topic Category
                </label>
                <select
                  id="dispatch-category"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-3 h-10 text-xs bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-[#141412] focus:bg-white focus:outline-none focus:border-[#0F392B]"
                >
                  {COMMUNITY_CATEGORIES.filter((c) => c !== 'All Dispatches').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="dispatch-city"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5"
                >
                  City or Campus
                </label>
                <input
                  id="dispatch-city"
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="e.g. New Delhi, Bengaluru"
                  required
                  minLength={2}
                  className="w-full px-3.5 h-10 text-xs bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-[#141412] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#0F392B]"
                />
                {composerErrors.city && <p className="mt-1 text-xs text-[#B91C1C]">{composerErrors.city}</p>}
              </div>

              <div>
                <label
                  htmlFor="dispatch-source"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5"
                >
                  Source Link
                </label>
                <input
                  id="dispatch-source"
                  type="url"
                  value={sourceLinkInput}
                  onChange={(e) => setSourceLinkInput(e.target.value)}
                  placeholder="https://example.com/source"
                  required
                  className="w-full px-3.5 h-10 text-xs bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-[#141412] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#0F392B]"
                />
                {composerErrors.source && <p className="mt-1 text-xs text-[#B91C1C]">{composerErrors.source}</p>}
              </div>
            </div>

            <div>
              <label
                htmlFor="dispatch-body"
                className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5"
              >
                Dispatch Body & Commentary
              </label>
              <textarea
                id="dispatch-body"
                rows={4}
                value={contentInput}
                onChange={(e) => {
                  setContentInput(e.target.value)
                  if (composerErrors.content) {
                    setComposerErrors((prev) => ({ ...prev, content: undefined }))
                  }
                }}
                placeholder="Share your structured analysis, relevant context, or firsthand insights on this issue..."
                className={`w-full p-3.5 text-sm bg-[#FAF7F2] border rounded-xl text-[#141412] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#0F392B] focus:ring-1 focus:ring-[#0F392B] transition-all ${
                  composerErrors.content ? 'border-[#B91C1C]' : 'border-[#E8E2D8]'
                }`}
              />
              {composerErrors.content && (
                <p className="mt-1 text-xs text-[#B91C1C] font-medium">
                  {composerErrors.content}
                </p>
              )}
            </div>

            {/* Editorial Standards Disclaimer */}
            <div className="p-3 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={disclaimerAgreed}
                  onChange={(e) => {
                    setDisclaimerAgreed(e.target.checked)
                    if (composerErrors.disclaimer) {
                      setComposerErrors((prev) => ({ ...prev, disclaimer: undefined }))
                    }
                  }}
                  className="mt-0.5 rounded border-[#E8E2D8] text-[#0F392B] focus:ring-[#0F392B]"
                />
                <span className="text-xs text-[#55504A] leading-relaxed">
                  I confirm this submission reflects firsthand observation or verifiable source evidence. I agree to Upwise Hub Community Standards.
                </span>
              </label>
              {composerErrors.disclaimer && (
                <p className="mt-1.5 text-xs text-[#B91C1C] font-medium">
                  {composerErrors.disclaimer}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseComposer}
                disabled={isSubmittingPost}
                className="px-4 py-2 rounded-full border border-[#E8E2D8] bg-white text-xs font-semibold text-[#55504A] hover:text-[#141412] hover:bg-[#FAF7F2] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPost}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0F392B] hover:bg-[#184837] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                {isSubmittingPost && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmittingPost ? 'Submitting...' : 'Publish Dispatch'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispatches Feed */}
      {filteredPosts.length === 0 ? (
        <div className="py-14 text-center bg-white border border-[#E8E2D8] rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#EDF3EF] flex items-center justify-center mx-auto mb-3 text-[#0F392B]">
            <Filter className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h3 className="font-serif font-semibold text-2xl text-[#141412] mb-1">
            No community dispatches found
          </h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto mb-5 leading-relaxed">
            Be the first reader to publish commentary in this category.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                onRequireLogin?.()
                return
              }
              setIsComposerOpen(true)
            }}
            className="rounded-full bg-[#0F392B] hover:bg-[#184837] text-white px-5 py-2 text-xs font-semibold shadow-xs transition-colors"
          >
            Start a Dispatch
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const hasUpvoted = votedPostIds.includes(post.id)
            const isSaved = savedPostIds.includes(post.id)
            const isCommentsExpanded = activeCommentPostId === post.id

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-[#E8E2D8] bg-white shadow-xs transition-all hover:border-[#D4CDBF]"
              >
                <div className="px-5 py-4 sm:px-6 sm:py-5">
                  {/* Category & Metadata Eyebrow */}
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D95D39] shrink-0" />
                      <span className="text-[#A7492F] uppercase">{post.category}</span>
                      {post.verificationLevel === 'verified' ? (
                        <>
                          <span className="text-[#D4CBBF]" aria-hidden="true">/</span>
                          <span className="inline-flex items-center gap-1 text-[#0F392B] font-semibold">
                            <CheckCircle2 className="w-3 h-3 stroke-[2]" />
                            Verified Dispatch
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#D4CBBF]" aria-hidden="true">/</span>
                          <span className="text-[#78716C]">Community Submission</span>
                        </>
                      )}
                      {post.city && (
                        <>
                          <span className="text-[#D4CBBF]" aria-hidden="true">•</span>
                          <span className="text-[#78716C] flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 shrink-0 text-[#78716C]" />
                            {post.city}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSavePost(post.id)}
                      aria-label={isSaved ? 'Remove bookmark' : 'Bookmark dispatch'}
                      title={isSaved ? 'Dispatch saved' : 'Save dispatch'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSaved ? 'text-[#0F392B] bg-[#EDF3EF]' : 'text-[#78716C] hover:text-[#141412] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 stroke-[1.75] ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Headline */}
                  <h2 className="font-serif text-[20px] sm:text-[22px] font-semibold leading-[1.25] tracking-tight text-[#141412] hover:text-[#0F392B] transition-colors mb-2.5">
                    {post.title}
                  </h2>

                  {/* Author & Timestamp */}
                  <div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#78716C]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#55504A]">
                      <div className="w-5 h-5 rounded-full bg-[#0F392B] text-white flex items-center justify-center font-bold text-[9px] shadow-xs">
                        {post.authorInitials || post.authorName.charAt(0)}
                      </div>
                      {post.authorName}
                    </span>
                    <span className="text-[#D4CBBF]">•</span>
                    <span>{post.createdAt}</span>
                  </div>

                  {/* Content */}
                  <p className="text-[13px] leading-[1.8] text-[#625D55] sm:text-sm whitespace-pre-line font-sans">
                    {post.content}
                  </p>

                  {/* Source Link */}
                  {post.sourceLink && (
                    <div className="mt-3.5">
                      <a
                        href={post.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#FAF7F2] text-[#0F392B] hover:underline border border-[#E8E2D8] max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">Source Reference: {post.sourceLink}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="px-5 py-2.5 sm:px-6 border-t border-[#F0ECE5] flex items-center justify-between text-xs text-[#78716C]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleUpvote(post.id)}
                      disabled={pendingVotes.includes(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        hasUpvoted
                          ? 'bg-[#FBF2EF] border-[#F3D5CC] text-[#D95D39]'
                          : 'bg-white border-[#E8E2D8] text-[#68645D] hover:text-[#141412] hover:bg-[#FAF7F2]'
                      }`}
                      title={hasUpvoted ? 'Remove upvote' : 'Upvote dispatch'}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 stroke-[1.75] ${hasUpvoted ? 'fill-current text-[#D95D39]' : ''}`} />
                      <span>{post.upvotes}</span>
                      <span className="hidden sm:inline">Upvotes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveCommentPostId(isCommentsExpanded ? null : post.id)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E2D8] bg-white text-[#68645D] hover:text-[#0F392B] hover:bg-[#FAF7F2] transition-colors text-xs font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5 stroke-[1.75]" />
                      <span>{post.comments.length}</span>
                      <span className="hidden sm:inline">Comments</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(post.id)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-[#D95D39] hover:bg-[#FAF7F2] transition-colors"
                      title="Report dispatch"
                    >
                      <Flag className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href)
                          setNoticeMessage('Link copied to clipboard.')
                          setTimeout(() => setNoticeMessage(null), 2500)
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-[#141412] hover:bg-[#FAF7F2] transition-colors"
                      title="Share dispatch"
                    >
                      <Share2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                  </div>
                </div>

                {/* Reviewer Moderation Controls */}
                {isReviewer && (
                  <div className="px-5 py-2.5 sm:px-6 bg-[#FAF7F2] border-t border-[#E8E2D8] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#0F392B] font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Reviewer Controls:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleModerate(post.id, 'approved', 'verified')}
                        type="button"
                        className="px-2.5 py-1 rounded-full bg-[#0F392B] text-white text-[11px] font-semibold hover:bg-[#184837] transition-colors"
                      >
                        Mark Verified
                      </button>
                      <button
                        onClick={() => handleModerate(post.id, 'approved', 'unverified')}
                        type="button"
                        className="px-2.5 py-1 rounded-full bg-white border border-[#E8E2D8] text-[#55504A] text-[11px] font-semibold hover:bg-[#FAF7F2] transition-colors"
                      >
                        Approve Unverified
                      </button>
                      <button
                        onClick={() => handleModerate(post.id, 'rejected')}
                        type="button"
                        className="px-2.5 py-1 rounded-full bg-[#D95D39] text-white text-[11px] font-semibold hover:bg-[#C2410C] transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Discussion / Comments */}
                {isCommentsExpanded && (
                  <div className="px-5 py-4 sm:px-6 bg-[#FAF7F2] border-t border-[#E8E2D8] space-y-3 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#55504A] mb-2">
                      Discussion ({post.comments.length})
                    </div>

                    {post.comments.length === 0 ? (
                      <p className="text-xs text-[#78716C] italic py-1">
                        No responses yet. Share your constructive perspective below.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-white border border-[#E8E2D8] p-3 rounded-xl text-xs shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[#78716C] mb-1">
                              <span className="font-semibold text-[#141412] flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-[#0F392B] text-white text-[8px] flex items-center justify-center font-bold">
                                  {comment.authorInitials || comment.authorName.charAt(0)}
                                </div>
                                {comment.authorName}
                              </span>
                              <span className="text-[10px] text-[#78716C]">{comment.createdAt}</span>
                            </div>
                            <p className="text-[#55504A] leading-relaxed whitespace-pre-line pl-5 font-sans">
                              {comment.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      onSubmit={(e) => handleAddComment(post.id, e)}
                      className="pt-2 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={commentInput[post.id] || ''}
                        onChange={(e) =>
                          setCommentInput((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Add your constructive perspective..."
                        className="flex-1 px-3.5 py-2 text-xs bg-white border border-[#E8E2D8] rounded-xl text-[#141412] placeholder:text-[#78716C] focus:bg-white focus:outline-none focus:border-[#0F392B]"
                      />
                      <button
                        type="submit"
                        disabled={!commentInput[post.id]?.trim()}
                        className="px-4 py-2 bg-[#0F392B] hover:bg-[#184837] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                    </form>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-8 text-center text-[11px] text-[#78716C] border-t border-[#E8E2D8] pt-4">
        Upwise Hub Community Dispatches • Verified citizen journalism and student commentary.
      </div>

      {/* Flag / Report Modal */}
      {reportingPostId && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-[#141412]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setReportingPostId(null)}
          />
          <div className="relative w-full max-w-md bg-white border border-[#E8E2D8] rounded-2xl shadow-2xl p-6 z-50 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D8]">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#D95D39]" />
                <h3 className="font-serif font-bold text-base text-[#141412]">
                  Report Community Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingPostId(null)}
                className="p-1.5 rounded-lg text-[#78716C] hover:text-[#141412] hover:bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReport} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5">
                  Reason for Reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-[#141412] focus:outline-none focus:border-[#0F392B]"
                >
                  <option value="Factually Inaccurate / Misleading Claims">Factually Inaccurate / Misleading Claims</option>
                  <option value="Plagiarism / Unattributed Source">Plagiarism / Unattributed Source</option>
                  <option value="Spam or Commercial Promotion">Spam or Commercial Promotion</option>
                  <option value="Harassment or Inappropriate Content">Harassment or Inappropriate Content</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#55504A] mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context or links demonstrating the inaccuracy..."
                  className="w-full p-2.5 text-xs bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl text-[#141412] focus:outline-none focus:border-[#0F392B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReportingPostId(null)}
                  disabled={isSubmittingReport}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-[#E8E2D8] bg-white text-[#55504A] hover:text-[#141412] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D95D39] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-full shadow-xs"
                >
                  {isSubmittingReport && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
