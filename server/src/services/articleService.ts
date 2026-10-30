import { publicationDateRange } from './dateRange.js';
import prisma from '../db.js';
import { FeedQueryParams, PaginatedResponse, ArticleItem, CategoryInfo, MapQueryParams } from '../types/index.js';
import { Prisma } from '@prisma/client';
import { parseCombinedQuery, extractArticleLocation } from './geoService.js';
import { SEED_ARTICLES } from '../ingestion/seedData.js';

export const CATEGORIES_DATA: CategoryInfo[] = [
  {
    id: 'india-politics',
    name: 'India & Politics',
    slug: 'india-politics',
    description: 'National affairs, parliamentary legislation, elections, governance, and diplomacy.',
    subcategories: [
      'Indian politics',
      'Government and policy',
      'Elections',
      'Current affairs',
      'International relations',
    ],
    color: '#C2410C', // Amber / Rust
    accentBg: '#FFFBEB',
    iconName: 'Building2',
  },
  {
    id: 'tech-science',
    name: 'Technology & Science',
    slug: 'technology-science',
    description: 'Artificial intelligence, space exploration, discoveries, hardware, and emerging startups.',
    subcategories: [
      'AI and technology',
      'Startups',
      'Gadgets',
      'Space',
      'Scientific discoveries',
    ],
    color: '#0369A1', // Sky blue
    accentBg: '#F0F9FF',
    iconName: 'Cpu',
  },
  {
    id: 'business-economy',
    name: 'Business & Economy',
    slug: 'business-economy',
    description: 'Markets, monetary policy, corporate developments, venture capital, and economic trends.',
    subcategories: [
      'Business',
      'Finance and markets',
      'Economy',
      'Careers and industry',
    ],
    color: '#047857', // Emerald green
    accentBg: '#ECFDF5',
    iconName: 'TrendingUp',
  },
  {
    id: 'sports',
    name: 'Sports',
    slug: 'sports',
    description: 'Live match analysis, cricket, football leagues, international tournaments, and athletics.',
    subcategories: [
      'Cricket',
      'Football',
      'Other sports',
      'Major tournaments',
    ],
    color: '#BE123C', // Rose / Ruby
    accentBg: '#FFF1F2',
    iconName: 'Trophy',
  },
  {
    id: 'world-lifestyle',
    name: 'World & Lifestyle',
    slug: 'world-lifestyle',
    description: 'Global affairs, climate & environmental treaties, healthcare innovations, and culture.',
    subcategories: [
      'World news',
      'Healthcare',
      'Education',
      'Environment',
      'Culture and entertainment',
    ],
    color: '#6D28D9', // Violet / Purple
    accentBg: '#F5F3FF',
    iconName: 'Globe',
  },
];

export async function getArticles(params: FeedQueryParams): Promise<PaginatedResponse<ArticleItem>> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
  const skip = (page - 1) * limit;

  const where: Prisma.ArticleWhereInput = {};

  // Category filter
  if (params.category && params.category !== 'All' && params.category !== 'all') {
    where.category = {
      equals: params.category,
      mode: 'insensitive',
    };
  }

  // Subcategory filter
  if (params.subcategory && params.subcategory !== 'All') {
    where.subcategory = {
      equals: params.subcategory,
      mode: 'insensitive',
    };
  }

  // Source / Publisher filter
  if (params.source && params.source !== 'All') {
    where.publisher = {
      equals: params.source,
      mode: 'insensitive',
    };
  }

  // Trending filter
  if (params.trendingOnly) {
    where.trending = true;
  }

  // Language filter
  if (params.language && params.language !== 'all') {
    where.language = params.language;
  }

  // Search query (in title, summary, or publisher)
  if (params.q && params.q.trim().length > 0) {
    const query = params.q.trim();
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { summary: { contains: query, mode: 'insensitive' } },
      { publisher: { contains: query, mode: 'insensitive' } },
    ];
  }

  const dateRange = publicationDateRange(params.dateRange, params.startDate, params.endDate);
  if (dateRange) where.publishedAt = dateRange;

  // Sorting
  let orderBy: Prisma.ArticleOrderByWithRelationInput = { publishedAt: 'desc' };
  if (params.sort === 'oldest') {
    orderBy = { publishedAt: 'asc' };
  } else if (params.sort === 'relevant') {
    orderBy = { viewCount: 'desc' };
  }

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        clusters: {
          include: {
            cluster: {
              include: {
                members: {
                  where: {
                    article: {
                      id: { not: undefined }
                    }
                  },
                  include: {
                    article: {
                      select: {
                        id: true,
                        title: true,
                        publisher: true,
                        url: true,
                        publishedAt: true,
                        imageUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: articles as unknown as ArticleItem[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    filterMeta: {
      category: params.category,
      totalActiveFilters: [
        params.category,
        params.subcategory,
        params.q,
        params.source,
        params.dateRange,
      ].filter(Boolean).length,
    },
  };
}

export async function getArticleById(id: string): Promise<ArticleItem | null> {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      clusters: {
        include: {
          cluster: {
            include: {
              members: {
                include: {
                  article: {
                    select: {
                      id: true,
                      title: true,
                      publisher: true,
                      url: true,
                      publishedAt: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (article) {
    // Increment view count asynchronously
    prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});
  }

  return article as unknown as ArticleItem | null;
}

export async function getTrendingArticles(limit: number = 6, language?: string): Promise<ArticleItem[]> {
  const where: Prisma.ArticleWhereInput = { trending: true };
  if (language && language !== 'all') {
    where.language = language;
  }
  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });

  if (articles.length < limit) {
    const additionalWhere: Prisma.ArticleWhereInput = {
      id: { notIn: articles.map(a => a.id) },
    };
    if (language && language !== 'all') {
      additionalWhere.language = language;
    }
    const additional = await prisma.article.findMany({
      where: additionalWhere,
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit - articles.length,
    });
    return [...articles, ...additional] as unknown as ArticleItem[];
  }

  return articles as unknown as ArticleItem[];
}

export async function getAvailablePublishers(): Promise<string[]> {
  const publishers = await prisma.article.findMany({
    select: { publisher: true },
    distinct: ['publisher'],
    orderBy: { publisher: 'asc' },
  });
  return publishers.map(p => p.publisher);
}

/**
 * Geographical news retrieval endpoint handler
 * Supports bounding box, location filter, combined topic+location queries, category, language, and date presets
 */
export async function getMapArticles(params: MapQueryParams): Promise<{
  data: ArticleItem[];
  total: number;
  centerLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  queryMeta?: {
    topic?: string;
    location?: string;
  };
}> {
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 100));
  const where: Prisma.ArticleWhereInput = {
    latitude: { not: null },
    longitude: { not: null },
  };

  let centerLocation: { name: string; latitude: number; longitude: number } | undefined;
  let queryTopic: string | undefined;
  let queryLocation: string | undefined;

  const andConditions: Prisma.ArticleWhereInput[] = [];

  // 1. Bounding box filter (minLng,minLat,maxLng,maxLat)
  if (params.bbox) {
    const parts = params.bbox.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      where.latitude = { gte: minLat, lte: maxLat };
      where.longitude = { gte: minLng, lte: maxLng };
    }
  }

  // 2. Specific location filter
  if (params.location && params.location !== 'all' && params.location !== 'global') {
    const parsed = parseCombinedQuery(params.location);
    if (parsed.matchedLocation) {
      queryLocation = parsed.matchedLocation.city || parsed.matchedLocation.state || parsed.matchedLocation.country;
      centerLocation = {
        name: queryLocation,
        latitude: parsed.matchedLocation.latitude,
        longitude: parsed.matchedLocation.longitude,
      };
      const locOr: Prisma.ArticleWhereInput[] = [];
      if (parsed.matchedLocation.city) locOr.push({ city: { equals: parsed.matchedLocation.city, mode: 'insensitive' } });
      if (parsed.matchedLocation.state) locOr.push({ state: { equals: parsed.matchedLocation.state, mode: 'insensitive' } });
      if (parsed.matchedLocation.country) locOr.push({ country: { equals: parsed.matchedLocation.country, mode: 'insensitive' } });
      locOr.push({ location: { contains: params.location, mode: 'insensitive' } });
      locOr.push({ title: { contains: params.location, mode: 'insensitive' } });
      andConditions.push({ OR: locOr });
    }
  }

  // 3. Search query (supports unified topic + location queries e.g. "AI news in Bengaluru", "Elections in Punjab")
  if (params.q && params.q.trim().length > 0) {
    const parsed = parseCombinedQuery(params.q);
    queryTopic = parsed.topicQuery;
    if (parsed.matchedLocation) {
      queryLocation = parsed.matchedLocation.city || parsed.matchedLocation.state || parsed.matchedLocation.country;
      if (!centerLocation) {
        centerLocation = {
          name: queryLocation,
          latitude: parsed.matchedLocation.latitude,
          longitude: parsed.matchedLocation.longitude,
        };
      }
      const locOr: Prisma.ArticleWhereInput[] = [];
      if (parsed.matchedLocation.city) locOr.push({ city: { equals: parsed.matchedLocation.city, mode: 'insensitive' } });
      if (parsed.matchedLocation.state) locOr.push({ state: { equals: parsed.matchedLocation.state, mode: 'insensitive' } });
      if (parsed.matchedLocation.country) locOr.push({ country: { equals: parsed.matchedLocation.country, mode: 'insensitive' } });
      locOr.push({ location: { contains: queryLocation, mode: 'insensitive' } });
      andConditions.push({ OR: locOr });
    }

    if (queryTopic && queryTopic.length > 0) {
      const topicOr: Prisma.ArticleWhereInput[] = [
        { title: { contains: queryTopic, mode: 'insensitive' } },
        { summary: { contains: queryTopic, mode: 'insensitive' } },
        { publisher: { contains: queryTopic, mode: 'insensitive' } },
      ];
      andConditions.push({ OR: topicOr });
    } else if (!parsed.matchedLocation) {
      const textQuery = params.q.trim();
      const freeOr: Prisma.ArticleWhereInput[] = [
        { title: { contains: textQuery, mode: 'insensitive' } },
        { summary: { contains: textQuery, mode: 'insensitive' } },
        { publisher: { contains: textQuery, mode: 'insensitive' } },
        { city: { contains: textQuery, mode: 'insensitive' } },
        { state: { contains: textQuery, mode: 'insensitive' } },
        { country: { contains: textQuery, mode: 'insensitive' } },
      ];
      andConditions.push({ OR: freeOr });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // 4. Category filter
  if (params.category && params.category !== 'All' && params.category !== 'all') {
    const catLower = params.category.toLowerCase().trim();
    const catMap: Record<string, string> = {
      'politics': 'India & Politics',
      'india-politics': 'India & Politics',
      'technology': 'Technology & Science',
      'tech-science': 'Technology & Science',
      'science': 'Technology & Science',
      'business': 'Business & Economy',
      'business-economy': 'Business & Economy',
      'sports': 'Sports',
      'world': 'World & Lifestyle',
      'world-lifestyle': 'World & Lifestyle',
      'environment': 'World & Lifestyle',
      'careers': 'Business & Economy',
    };
    const targetCat = catMap[catLower] || params.category;
    where.category = { equals: targetCat, mode: 'insensitive' };
  }

  // 5. Language filter
  if (params.language && params.language !== 'all') {
    where.language = params.language;
  }

  const dateRange = publicationDateRange(params.dateRange, params.startDate, params.endDate);
  if (dateRange) where.publishedAt = dateRange;

  // 7. Sorting
  let orderBy: Prisma.ArticleOrderByWithRelationInput = { publishedAt: 'desc' };
  if (params.sort === 'oldest') {
    orderBy = { publishedAt: 'asc' };
  } else if (params.sort === 'relevant') {
    orderBy = { viewCount: 'desc' };
  }

  let total = 0;
  let articles: ArticleItem[] = [];

  try {
    const [dbTotal, dbArticles] = await Promise.race([
      Promise.all([
        prisma.article.count({ where }),
        prisma.article.findMany({
          where,
          orderBy,
          take: limit,
          include: {
            clusters: {
              include: {
                cluster: {
                  include: {
                    members: {
                      where: {
                        article: {
                          id: { not: undefined }
                        }
                      },
                      include: {
                        article: {
                          select: {
                            id: true,
                            title: true,
                            publisher: true,
                            url: true,
                            publishedAt: true,
                            imageUrl: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DB Timeout')), 1200)
      ),
    ]);

    total = dbTotal;
    articles = dbArticles as unknown as ArticleItem[];

  } catch (_dbError) {
    // Database connection unavailable or in standalone/test mode; fall back gracefully
    articles = getFallbackMapArticles(params);
    total = articles.length;
  }

  return {
    data: articles,
    total,
    centerLocation,
    queryMeta: {
      topic: queryTopic,
      location: queryLocation,
    },
  };
}

export function getFallbackMapArticles(params: MapQueryParams): ArticleItem[] {
  let list = SEED_ARTICLES.map((item, idx) => {
    const geo = (item.latitude && item.longitude)
      ? {
          latitude: item.latitude,
          longitude: item.longitude,
          location: item.location || item.city || item.state || item.country || '',
          city: item.city,
          state: item.state,
          country: item.country || 'India',
        }
      : extractArticleLocation(item.title, item.summary, item.content);

    if (!geo) return null;

    const articleItem: ArticleItem = {
      id: `seed-map-${idx + 1}`,
      title: item.title,
      summary: item.summary,
      content: item.content,
      url: item.url,
      publisher: item.publisher,
      category: item.category,
      subcategory: item.subcategory,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
      readingTime: item.readingTime,
      trending: item.trending,
      viewCount: item.trending ? 450 : 120,
      language: item.language || 'en',
      latitude: geo.latitude,
      longitude: geo.longitude,
      location: geo.location,
      city: geo.city,
      state: geo.state,
      country: geo.country,
      createdAt: item.publishedAt,
      updatedAt: item.publishedAt,
    };
    return articleItem;
  }).filter((a): a is ArticleItem => a !== null);

  // Apply filters
  if (params.bbox) {
    const parts = params.bbox.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      list = list.filter(
        (a) =>
          a.latitude! >= minLat &&
          a.latitude! <= maxLat &&
          a.longitude! >= minLng &&
          a.longitude! <= maxLng
      );
    }
  }

  if (params.location && params.location !== 'all' && params.location !== 'global') {
    const parsed = parseCombinedQuery(params.location);
    const locName = (parsed.locationQuery || params.location).toLowerCase();
    list = list.filter((a) => {
      const text = `${a.city || ''} ${a.state || ''} ${a.country || ''} ${a.location || ''} ${a.title}`.toLowerCase();
      return text.includes(locName);
    });
  }

  if (params.q && params.q.trim()) {
    const parsed = parseCombinedQuery(params.q);
    if (parsed.matchedLocation) {
      const locName = (parsed.locationQuery || '').toLowerCase();
      list = list.filter((a) => {
        const text = `${a.city || ''} ${a.state || ''} ${a.country || ''} ${a.location || ''}`.toLowerCase();
        return text.includes(locName);
      });
    }
    if (parsed.topicQuery) {
      const topic = parsed.topicQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(topic) ||
          a.summary.toLowerCase().includes(topic) ||
          a.publisher.toLowerCase().includes(topic)
      );
    } else if (!parsed.matchedLocation) {
      const q = params.q.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.publisher.toLowerCase().includes(q) ||
          (a.city && a.city.toLowerCase().includes(q)) ||
          (a.state && a.state.toLowerCase().includes(q)) ||
          (a.country && a.country.toLowerCase().includes(q))
      );
    }
  }

  if (params.category && params.category !== 'all' && params.category !== 'All') {
    const catLower = params.category.toLowerCase();
    const catMap: Record<string, string> = {
      'politics': 'india & politics',
      'india-politics': 'india & politics',
      'technology': 'technology & science',
      'tech-science': 'technology & science',
      'science': 'technology & science',
      'business': 'business & economy',
      'business-economy': 'business & economy',
      'sports': 'sports',
      'world': 'world & lifestyle',
      'world-lifestyle': 'world & lifestyle',
    };
    const target = catMap[catLower] || catLower;
    list = list.filter((a) => a.category.toLowerCase() === target);
  }

  if (params.language && params.language !== 'all') {
    list = list.filter((a) => a.language === params.language);
  }

  const dateRange = publicationDateRange(params.dateRange, params.startDate, params.endDate);
  if (dateRange) list = list.filter((article) => {
    const timestamp = +new Date(article.publishedAt);
    return (!dateRange.gte || timestamp >= +dateRange.gte) && (!dateRange.lt || timestamp < +dateRange.lt);
  });

  // Sort
  if (params.sort === 'oldest') {
    list.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  } else if (params.sort === 'relevant') {
    list.sort((a, b) => b.viewCount - a.viewCount);
  } else {
    list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  const limit = Math.min(200, Math.max(1, Number(params.limit) || 100));
  return list.slice(0, limit);
}
