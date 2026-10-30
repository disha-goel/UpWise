import { Router, Request, Response } from 'express';
import {
  getArticles,
  getArticleById,
  getTrendingArticles,
  getAvailablePublishers,
  getMapArticles,
  CATEGORIES_DATA,
} from '../services/articleService.js';
import { refreshAllFeeds } from '../ingestion/ingestionService.js';
import prisma from '../db.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = Router();

function getHeaderString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

router.get('/categories', (_req: Request, res: Response) => {
  res.json({ success: true, data: CATEGORIES_DATA });
});

router.get('/publishers', async (_req: Request, res: Response) => {
  try {
    const publishers = await getAvailablePublishers();
    res.json({ success: true, data: publishers });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/trending', async (req: Request, res: Response) => {
  try {
    const language = req.query.language as string | undefined;
    const articles = await getTrendingArticles(6, language);
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/articles', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      category,
      subcategory,
      q,
      source,
      dateRange,
      startDate,
      endDate,
      sort,
      page,
      limit,
      trendingOnly,
      language,
      personalized,
    } = req.query;

    let targetCategory = category as string;

    if (personalized === 'true' && req.user?.id && (!targetCategory || targetCategory === 'All')) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { interests: true },
      });
      if (user && user.interests.length > 0) {
        targetCategory = user.interests[0].category;
      }
    }

    const result = await getArticles({
      category: targetCategory,
      subcategory: subcategory as string,
      q: q as string,
      source: source as string,
      dateRange: dateRange as 'today' | 'yesterday' | '7d' | '30d' | 'custom',
      startDate: startDate as string,
      endDate: endDate as string,
      sort: sort as 'latest' | 'oldest' | 'relevant',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 12,
      trendingOnly: trendingOnly === 'true',
      language: language as 'en' | 'hi' | 'all' | undefined,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/articles/map
 * Retrieve geographic news articles with verified coordinates.
 * Supports bounding box, location filter, combined topic+location queries, category, language, dateRange, and limits.
 */
router.get('/articles/map', async (req: Request, res: Response) => {
  try {
    const {
      bbox,
      location,
      q,
      category,
      language,
      dateRange,
      startDate,
      endDate,
      sort,
      limit,
    } = req.query;

    const result = await getMapArticles({
      bbox: bbox as string,
      location: location as string,
      q: q as string,
      category: category as string,
      language: language as 'en' | 'hi' | 'all' | undefined,
      dateRange: dateRange as 'today' | 'yesterday' | '7d' | '30d' | 'custom' | undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      sort: sort as 'latest' | 'oldest' | 'relevant' | undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.json({ success: true, data: [], pagination: { total: 0 } });
    }

    const result = await getArticles({
      q: query,
      limit: 20,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const article = await getArticleById(id);

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/clusters/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cluster = await prisma.storyCluster.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            article: true,
          },
        },
      },
    });

    if (!cluster) {
      return res.status(404).json({ success: false, error: 'Cluster not found' });
    }

    res.json({ success: true, data: cluster });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/news/refresh', async (_req: Request, res: Response) => {
  try {
    const stats = await refreshAllFeeds();
    res.json({ success: true, message: 'Feeds refreshed successfully', stats });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/bookmarks', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const guestSessionId = userId ? undefined : getHeaderString(req.headers['x-guest-session']);

    if (!userId && !guestSessionId) {
      return res.json({ success: true, data: [] });
    }

    const conditions = [];
    if (userId) conditions.push({ userId });
    if (guestSessionId) conditions.push({ guestSessionId });

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        OR: conditions,
      },
      include: {
        article: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: bookmarks.map((b) => b.article) });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/bookmarks', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { articleId } = req.body;
    const userId = req.user?.id;
    const guestSessionId = userId ? undefined : getHeaderString(req.headers['x-guest-session']);

    if (!userId && !guestSessionId) {
      return res.status(401).json({ success: false, error: 'Sign in or provide a guest session to save articles' });
    }

    if (typeof articleId !== 'string' || !articleId.trim()) {
      return res.status(400).json({ success: false, error: 'articleId is required' });
    }

    const conditions = [];
    if (userId) conditions.push({ userId });
    if (guestSessionId) conditions.push({ guestSessionId });

    if (conditions.length > 0) {
      const existing = await prisma.bookmark.findFirst({
        where: {
          articleId,
          OR: conditions,
        },
        include: { article: true },
      });

      if (existing) {
        return res.json({ success: true, data: existing, alreadyBookmarked: true });
      }
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        articleId,
        guestSessionId: !userId ? guestSessionId : null,
        userId: userId || null,
      },
      include: { article: true },
    });

    res.json({ success: true, data: bookmark });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/bookmarks/:articleId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const articleId = Array.isArray(req.params.articleId) ? req.params.articleId[0] : req.params.articleId;
    const userId = req.user?.id;
    const guestSessionId = userId ? undefined : getHeaderString(req.headers['x-guest-session']);

    const conditions = [];
    if (userId) conditions.push({ userId });
    if (guestSessionId) conditions.push({ guestSessionId });

    if (conditions.length > 0) {
      await prisma.bookmark.deleteMany({
        where: {
          articleId,
          OR: conditions,
        },
      });
    }

    res.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    res.status((error as Error).message.startsWith('Invalid date range:') ? 400 : 500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
