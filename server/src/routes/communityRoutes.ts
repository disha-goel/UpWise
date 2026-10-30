import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import {
  getCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  moderateCommunityPost,
  reportCommunityPost,
  getCommentsForPost,
  addCommentToPost,
  deleteComment,
  togglePostReaction,
} from '../services/communityService.js';
import { requireAuth, optionalAuth, extractUserFromRequest } from '../middlewares/authMiddleware.js';

const router = Router();

function getGuestId(req: Request): string | undefined {
  const guestHeader = req.headers['x-guest-session'];
  if (Array.isArray(guestHeader)) return guestHeader[0];
  return guestHeader || undefined;
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { city, category, status, search, page, limit } = req.query;

    const result = await getCommunityPosts({
      city: city as string,
      category: category as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 12,
      includePendingForUser: req.user?.id,
      currentUserId: req.user?.id,
      isReviewer: req.user?.role === 'reviewer' || req.user?.role === 'admin',
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const post = await getCommunityPostById(id, req.user?.id);

    if (!post || (post.status !== 'approved' && post.authorId !== req.user?.id && req.user?.role !== 'reviewer' && req.user?.role !== 'admin')) {
      return res.status(404).json({ success: false, error: 'Community post not found' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      city,
      locality,
      category,
      eventDate,
      sourceUrl,
      sourceExplanation,
      imageUrl,
      disclaimerAgreed,
    } = req.body;

    const post = await createCommunityPost({
      title,
      description,
      city,
      locality,
      category,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      sourceUrl,
      sourceExplanation,
      imageUrl,
      disclaimerAgreed: disclaimerAgreed === true,
      authorId: req.user!.id,
    });

    res.json({ success: true, data: post, message: 'Report submitted for review.' });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.communityPost.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (existing.authorId !== req.user!.id && req.user!.role !== 'reviewer' && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this post' });
    }

    const { title, description, city, locality, category, sourceUrl, sourceExplanation, imageUrl } = req.body;

    const updated = await prisma.communityPost.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(description ? { description: description.trim() } : {}),
        ...(city ? { city: city.trim() } : {}),
        locality: locality !== undefined ? locality : existing.locality,
        ...(category ? { category } : {}),
        sourceUrl: sourceUrl !== undefined ? sourceUrl : existing.sourceUrl,
        sourceExplanation: sourceExplanation !== undefined ? sourceExplanation : existing.sourceExplanation,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.communityPost.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (existing.authorId !== req.user!.id && req.user!.role !== 'reviewer' && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
    }

    await prisma.communityPost.delete({ where: { id } });
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id/comments', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const post = await getCommunityPostById(id, req.user?.id);
    if (!post || (post.status !== 'approved' && post.authorId !== req.user?.id && req.user?.role !== 'reviewer' && req.user?.role !== 'admin')) {
      return res.status(404).json({ success: false, error: 'Community post not found' });
    }
    const comments = await getCommentsForPost(id);
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { content } = req.body;

    const comment = await addCommentToPost(id, req.user!.id, content);
    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;
    await deleteComment(commentId, req.user!.id, req.user!.role);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/reactions', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const guestId = getGuestId(req);

    if (!req.user?.id && !guestId) {
      return res.status(401).json({ success: false, error: 'Sign in or guest session required to vote' });
    }

    const result = await togglePostReaction(id, req.user?.id, guestId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/moderate', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'reviewer' && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only authorized reviewers may moderate posts' });
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, verificationLevel } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updated = await moderateCommunityPost(id, status, verificationLevel);
    res.json({ success: true, data: updated, message: `Post status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/report', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason, details } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Please select a reason for reporting' });
    }

    const report = await reportCommunityPost(id, req.user?.id || null, reason, details);
    res.json({ success: true, data: report, message: 'Report submitted to editorial moderators.' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
