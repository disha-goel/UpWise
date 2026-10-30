import prisma from '../db.js';

export interface CreateCommunityPostInput {
  title: string;
  description: string;
  city: string;
  locality?: string;
  category: string;
  eventDate?: Date;
  sourceUrl?: string;
  sourceExplanation?: string;
  imageUrl?: string;
  disclaimerAgreed: boolean;
  authorId: string;
}

export interface GetCommunityPostsQuery {
  city?: string;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  includePendingForUser?: string;
  currentUserId?: string;
  isReviewer?: boolean;
}

export async function getCommunityPosts(query: GetCommunityPostsQuery) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 12;
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (query.city && query.city !== 'All Cities' && query.city !== 'All') {
    whereClause.city = { contains: query.city, mode: 'insensitive' };
  }

  if (query.category && query.category !== 'All') {
    whereClause.category = query.category;
  }

  if (query.search && query.search.trim()) {
    whereClause.OR = [
      { title: { contains: query.search.trim(), mode: 'insensitive' } },
      { description: { contains: query.search.trim(), mode: 'insensitive' } },
      { city: { contains: query.search.trim(), mode: 'insensitive' } },
      { locality: { contains: query.search.trim(), mode: 'insensitive' } },
    ];
  }

  const visibility = query.isReviewer ? {} : {
    OR: [
      { status: 'approved' },
      ...(query.includePendingForUser ? [{ authorId: query.includePendingForUser }] : []),
    ],
  };
  if (query.status && query.status !== 'all') whereClause.status = query.status;
  whereClause.AND = [visibility];

  const [total, posts] = await Promise.all([
    prisma.communityPost.count({ where: whereClause }),
    prisma.communityPost.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            city: true,
          },
        },
        reactions: query.currentUserId
          ? {
              where: { userId: query.currentUserId },
              select: { id: true, type: true },
            }
          : false,
        _count: {
          select: {
            comments: true,
            reactions: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const formattedPosts = posts.map((post) => ({
    ...post,
    hasUpvoted: query.currentUserId ? Boolean(post.reactions && post.reactions.length > 0) : false,
    upvotesCount: post._count.reactions,
    commentsCount: post._count.comments,
  }));

  return {
    data: formattedPosts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + posts.length < total,
    },
  };
}

export async function getCommunityPostById(id: string, currentUserId?: string) {
  const post = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
          city: true,
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      reactions: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { id: true, type: true },
          }
        : false,
      _count: {
        select: {
          comments: true,
          reactions: true,
          reports: true,
        },
      },
    },
  });

  if (!post) return null;

  return {
    ...post,
    hasUpvoted: currentUserId ? Boolean(post.reactions && post.reactions.length > 0) : false,
    upvotesCount: post._count.reactions,
    commentsCount: post._count.comments,
  };
}

export async function createCommunityPost(input: CreateCommunityPostInput) {
  if (!input.title || input.title.trim().length < 5) {
    throw new Error('Headline must be at least 5 characters');
  }
  if (!input.description || input.description.trim().length < 20) {
    throw new Error('Detailed description must be at least 20 characters');
  }
  if (!input.city || input.city.trim().length < 2) {
    throw new Error('City is required and must be explicitly specified');
  }
  if (!input.category) {
    throw new Error('Category is required');
  }
  if (!input.sourceUrl && !input.sourceExplanation) {
    throw new Error('Please provide a supporting source link or explanation of origin');
  }
  if (!input.disclaimerAgreed) {
    throw new Error('You must acknowledge the community reporting disclaimer');
  }

  return prisma.communityPost.create({
    data: {
      title: input.title.trim(),
      description: input.description.trim(),
      city: input.city.trim(),
      locality: input.locality ? input.locality.trim() : null,
      category: input.category,
      eventDate: input.eventDate || new Date(),
      sourceUrl: input.sourceUrl?.trim() || null,
      sourceExplanation: input.sourceExplanation?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      disclaimerAgreed: true,
      status: 'pending',
      verificationLevel: 'unverified',
      authorId: input.authorId,
    },
    include: {
      author: {
        select: { id: true, name: true, role: true, city: true },
      },
      _count: {
        select: { comments: true, reactions: true, reports: true },
      },
    },
  });
}

export async function moderateCommunityPost(
  postId: string,
  status: 'approved' | 'rejected',
  verificationLevel?: 'unverified' | 'verified'
) {
  return prisma.communityPost.update({
    where: { id: postId },
    data: {
      status,
      ...(verificationLevel ? { verificationLevel } : {}),
    },
  });
}

export async function reportCommunityPost(
  postId: string,
  reporterId: string | null,
  reason: string,
  details?: string
) {
  return prisma.communityReport.create({
    data: {
      postId,
      reporterId,
      reason,
      details,
    },
  });
}

export async function getCommentsForPost(postId: string) {
  return prisma.comment.findMany({
    where: { postId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addCommentToPost(postId: string, authorId: string, content: string) {
  if (!content || content.trim().length < 2) {
    throw new Error('Comment must be at least 2 characters long');
  }

  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('Post not found');
  }

  return prisma.comment.create({
    data: {
      postId,
      authorId,
      content: content.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
}

export async function deleteComment(commentId: string, userId: string, userRole: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new Error('Comment not found');
  }

  if (comment.authorId !== userId && userRole !== 'reviewer' && userRole !== 'admin') {
    throw new Error('Not authorized to delete this comment');
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return true;
}

export async function togglePostReaction(postId: string, userId?: string, guestId?: string) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('Post not found');
  }

  if (userId) {
    const existing = await prisma.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      await prisma.postReaction.delete({ where: { id: existing.id } });
      const totalUpvotes = await prisma.postReaction.count({ where: { postId } });
      return { upvoted: false, totalUpvotes };
    } else {
      await prisma.postReaction.create({
        data: {
          postId,
          userId,
          type: 'upvote',
        },
      });
      const totalUpvotes = await prisma.postReaction.count({ where: { postId } });
      return { upvoted: true, totalUpvotes };
    }
  } else if (guestId) {
    const existing = await prisma.postReaction.findFirst({
      where: { postId, guestId },
    });

    if (existing) {
      await prisma.postReaction.delete({ where: { id: existing.id } });
      const totalUpvotes = await prisma.postReaction.count({ where: { postId } });
      return { upvoted: false, totalUpvotes };
    } else {
      await prisma.postReaction.create({
        data: {
          postId,
          guestId,
          type: 'upvote',
        },
      });
      const totalUpvotes = await prisma.postReaction.count({ where: { postId } });
      return { upvoted: true, totalUpvotes };
    }
  }

  throw new Error('User identification required to vote');
}

export async function seedCommunityPosts(): Promise<void> {
  const count = await prisma.communityPost.count();
  if (count > 0) return;

  const author = await prisma.user.findFirst();
  if (!author) return;

  const initialPosts = [
    {
      title: 'Varanasi Smart City Expands Free Solar-Powered Public Wi-Fi to 14 River Ghats',
      description: 'Municipal officials and local citizen volunteers have activated high-speed Wi-Fi kiosks along Assi, Dashashwamedh, and Manikarnika ghats. The units are powered entirely by rooftop solar micro-arrays and offer tourists and students up to 1GB daily high-speed browsing.',
      city: 'Varanasi',
      locality: 'Assi Ghat & Riverfront',
      category: 'Technology & Science',
      eventDate: new Date(Date.now() - 4 * 3600 * 1000),
      sourceUrl: 'https://smartcities.gov.in/varanasi-wifi-phase2',
      sourceExplanation: 'Direct observation at Assi Ghat inauguration accompanied by Municipal Corporation press release.',
      imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
      verificationLevel: 'verified',
      authorId: author.id,
    },
    {
      title: 'Bengaluru Outer Ring Road Transit Volunteers Report New EV Feeder Bus Frequencies',
      description: 'Commuters along Bellandur and Marathahalli flyover have observed a 15-minute headway reduction in BMTC electric feeder routes connecting Purple Line metro stations with tech parks.',
      city: 'Bengaluru',
      locality: 'Bellandur - ORR Corridor',
      category: 'India & Politics',
      eventDate: new Date(Date.now() - 8 * 3600 * 1000),
      sourceUrl: 'https://bmtc.karnataka.gov.in/metro-feeder-services',
      sourceExplanation: 'Compiled from BMTC timetable noticeboard at Kadubeesanahalli station and commuter log.',
      imageUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
      verificationLevel: 'verified',
      authorId: author.id,
    },
    {
      title: 'Connaught Place Traders Association Initiates Rainwater Harvesting Renovation in Central Circle',
      description: 'Over 40 heritage block commercial buildings in Connaught Place are installing underground bio-filtration percolation pits ahead of monsoon to curb urban waterlogging.',
      city: 'New Delhi',
      locality: 'Connaught Place Inner Circle',
      category: 'World & Lifestyle',
      eventDate: new Date(Date.now() - 14 * 3600 * 1000),
      sourceExplanation: 'Meeting minutes of CP Traders & Resident Welfare Joint Committee on October 25.',
      imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
      verificationLevel: 'unverified',
      authorId: author.id,
    },
    {
      title: 'Mumbai Coastal Road Promenade Adds 24/7 Citizen First-Aid Stalls & Lifebuoys',
      description: 'Local volunteer ocean-safety squads have equipped new rescue beacons and emergency AED defibrillator boxes along the Worli-Marine Drive seaside promenade.',
      city: 'Mumbai',
      locality: 'Worli Seaface Promenade',
      category: 'World & Lifestyle',
      eventDate: new Date(Date.now() - 20 * 3600 * 1000),
      sourceUrl: 'https://portal.mcgm.gov.in',
      sourceExplanation: 'Official BMC safety squad signage on-site.',
      imageUrl: 'https://images.unsplash.com/photo-1566552881560-0be86c53957f?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
      verificationLevel: 'verified',
      authorId: author.id,
    },
    {
      title: 'Local Youth Football Tournament Kicks Off at Shivaji Park with 32 Neighborhood Teams',
      description: 'Dadar sports community foundation has launched an annual grassroots league to scout and train under-18 municipal school players across Maharashtra.',
      city: 'Mumbai',
      locality: 'Dadar Shivaji Park',
      category: 'Sports',
      eventDate: new Date(Date.now() - 28 * 3600 * 1000),
      sourceExplanation: 'Match schedules and roster pinned at Shivaji Park Pavilion.',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
      verificationLevel: 'unverified',
      authorId: author.id,
    },
    {
      title: 'Community Tree Planting Drive Planned for Sarjapur Lake Buffer Zone This Weekend',
      description: 'Citizens across Sarjapur and Harlur have raised sapling donations for native wetland trees (Neem, Honge, Peepal) to protect local lake bird biodiversity.',
      city: 'Bengaluru',
      locality: 'Sarjapur Road / Kaikondrahalli',
      category: 'World & Lifestyle',
      eventDate: new Date(Date.now() + 24 * 3600 * 1000),
      sourceExplanation: 'Organized by Mahadevapura Lake Citizens Collective via public notice.',
      imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      status: 'pending',
      verificationLevel: 'unverified',
      authorId: author.id,
    },
  ];

  for (const post of initialPosts) {
    await prisma.communityPost.create({ data: post });
  }
}
