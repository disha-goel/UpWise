import 'dotenv/config';
import prisma from './db.js';
import { seedDefaultUsers } from './services/authService.js';
import { seedCommunityPosts } from './services/communityService.js';
import { seedInitialArticles } from './ingestion/ingestionService.js';

async function seed() {
  await seedDefaultUsers();
  await seedCommunityPosts();
  await seedInitialArticles();
}
seed().catch((error) => {
  console.error('Database seeding failed:', error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
