import express, { Request, Response } from 'express';
import cors from 'cors';
import './config.js';

import articleRoutes from './routes/articleRoutes.js';
import authRoutes from './routes/authRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import prisma from './db.js';
import { getJwtSecret } from './config.js';
import { seedInitialArticles, refreshAllFeeds } from './ingestion/ingestionService.js';
import { seedDefaultUsers } from './services/authService.js';
import { seedCommunityPosts } from './services/communityService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-session'],
  })
);

app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const articleCount = await prisma.article.count();
    const clusterCount = await prisma.storyCluster.count();
    const sourceCount = await prisma.source.count();
    const userCount = await prisma.user.count();
    const postCount = await prisma.communityPost.count();

    res.json({
      status: 'ok',
      service: 'UPWISE News API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      stats: {
        articles: articleCount,
        clusters: clusterCount,
        sources: sourceCount,
        users: userCount,
        communityPosts: postCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'UPWISE News API',
      error: (error as Error).message,
    });
  }
});

app.use('/api', articleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai', aiRoutes);

app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

export { app };

const isTestEnvironment = process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  getJwtSecret();
  app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`🚀 UPWISE Backend listening on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);

    try {
      await seedDefaultUsers();
      await seedCommunityPosts();
      await seedInitialArticles();

      setTimeout(() => {
        console.log('[Background] Running initial live RSS refresh...');
        refreshAllFeeds().catch((err) => {
          console.warn('[Background RSS error]', err.message);
        });
      }, 2000);
    } catch (error) {
      console.error('[Initialization Error]', error);
    }
  });
}

export default app;
