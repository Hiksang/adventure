import { NextResponse } from 'next/server';
import type { FeedItem, FeedResponse } from '@/types';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import { meetsTargetingCriteria, AdTargeting, UserCredentials, AgeRange, CountryCode } from '@/lib/worldid/credentials';

// Extended ad type with targeting
interface TargetedAd {
  id: string;
  title: string;
  brand: string;
  type: 'image' | 'video';
  url: string;
  xp_reward: number;
  duration_seconds: number;
  targeting?: AdTargeting;
  targeting_premium?: number;
}

// Mock feed items with targeting
const MOCK_CONTENT_ITEMS: FeedItem[] = [
  {
    id: 'content-1',
    type: 'content',
    content: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      creator: 'nature_lover',
      description: 'Beautiful mountain sunrise this morning',
      likes: 1234,
      comments: 56,
    },
  },
  {
    id: 'content-2',
    type: 'content',
    content: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
      creator: 'travel_daily',
      description: 'Streets of Tokyo at night',
      likes: 892,
      comments: 34,
    },
  },
  {
    id: 'content-3',
    type: 'content',
    content: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      creator: 'foodie_world',
      description: 'Homemade pasta from scratch',
      likes: 2341,
      comments: 128,
    },
  },
  {
    id: 'content-4',
    type: 'content',
    content: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
      creator: 'adventure_seeker',
      description: 'Golden Gate Bridge at sunset',
      likes: 567,
      comments: 23,
    },
  },
  {
    id: 'content-5',
    type: 'content',
    content: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800',
      creator: 'photo_art',
      description: 'Starry night in the mountains',
      likes: 4521,
      comments: 234,
    },
  },
  {
    id: 'content-6',
    type: 'content',
    content: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      creator: 'city_vibes',
      description: 'Urban jungle vibes',
      likes: 789,
      comments: 45,
    },
  },
];

// Mock ads with targeting criteria
const MOCK_ADS: TargetedAd[] = [
  {
    id: 'ad-1',
    title: 'New Galaxy S25 Ultra',
    brand: 'Samsung',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
    xp_reward: 50,
    duration_seconds: 5,
    // No targeting = everyone can see
  },
  {
    id: 'ad-2',
    title: '한국 20대를 위한 특별 혜택',
    brand: 'Korean Brand',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',
    xp_reward: 75,  // Premium reward for targeted ad
    duration_seconds: 5,
    targeting: {
      ageRanges: ['18-24', '25-34'] as AgeRange[],
      nationalities: ['KR'] as CountryCode[],
    },
    targeting_premium: 1.5,
  },
  {
    id: 'ad-3',
    title: 'Nike Air Max 2025',
    brand: 'Nike',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    xp_reward: 50,
    duration_seconds: 5,
    // No targeting = everyone can see
  },
  {
    id: 'ad-4',
    title: 'Premium Members Only',
    brand: 'World App',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800',
    xp_reward: 100,  // High reward for orb-verified
    duration_seconds: 5,
    targeting: {
      verificationLevelRequired: 'orb',
    },
    targeting_premium: 2.0,
  },
  {
    id: 'ad-5',
    title: 'Asia Pacific Special',
    brand: 'APAC Brand',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
    xp_reward: 60,
    duration_seconds: 5,
    targeting: {
      nationalities: ['KR', 'JP', 'TW', 'SG'] as CountryCode[],
    },
    targeting_premium: 1.2,
  },
];

const MOCK_QUIZZES = [
  {
    id: 'quiz-1',
    question: 'What is the display size of the Galaxy S25 Ultra?',
    options: ['6.2 inch', '6.8 inch', '7.2 inch', '6.5 inch'],
    correct_index: 1,
    xp_reward: 25,
    related_ad_id: 'ad-1',
  },
];

// Get user credentials from database
async function getUserCredentials(nullifierHash: string): Promise<UserCredentials | null> {
  if (IS_DEV) {
    // DEV mode: return mock credentials
    return {
      nullifierHash: 'dev-nullifier',
      verificationLevel: 'device',
      ageVerified: true,
      ageRange: '25-34',
      nationalityVerified: true,
      nationality: 'KR',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('user_credentials')
    .select('*')
    .eq('nullifier_hash', nullifierHash)
    .single();

  if (!data) return null;

  return {
    nullifierHash: data.nullifier_hash,
    verificationLevel: data.verification_level,
    ageVerified: data.age_verified,
    ageRange: data.age_range,
    nationalityVerified: data.nationality_verified,
    nationality: data.nationality,
    lastUpdated: data.updated_at,
  };
}

// Filter ads based on user credentials
function filterAdsForUser(ads: TargetedAd[], userCredentials: UserCredentials | null): TargetedAd[] {
  return ads.filter(ad => meetsTargetingCriteria(userCredentials, ad.targeting || null));
}

// Build feed with interleaved content and ads
function buildFeed(
  contentItems: FeedItem[],
  eligibleAds: TargetedAd[],
  quizzes: typeof MOCK_QUIZZES
): FeedItem[] {
  const feed: FeedItem[] = [];
  let adIndex = 0;
  let quizIndex = 0;

  for (let i = 0; i < contentItems.length; i++) {
    feed.push(contentItems[i]);

    // Insert ad every 2-3 content items
    if ((i + 1) % 2 === 0 && adIndex < eligibleAds.length) {
      const ad = eligibleAds[adIndex];
      feed.push({
        id: ad.id,
        type: 'ad',
        ad: {
          id: ad.id,
          title: ad.title,
          brand: ad.brand,
          type: ad.type,
          url: ad.url,
          xp_reward: ad.xp_reward,
          duration_seconds: ad.duration_seconds,
        },
      });
      adIndex++;

      // Add quiz after ad if available
      if (quizIndex < quizzes.length && quizzes[quizIndex].related_ad_id === ad.id) {
        feed.push({
          id: quizzes[quizIndex].id,
          type: 'quiz',
          quiz: quizzes[quizIndex],
        });
        quizIndex++;
      }
    }
  }

  return feed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '10');
  const nullifierHash = searchParams.get('nullifier');

  // Get user credentials for targeting
  let userCredentials: UserCredentials | null = null;
  if (nullifierHash) {
    userCredentials = await getUserCredentials(nullifierHash);
  }

  // Filter ads based on user credentials
  const eligibleAds = filterAdsForUser(MOCK_ADS, userCredentials);

  // Build personalized feed
  const allItems = buildFeed(MOCK_CONTENT_ITEMS, eligibleAds, MOCK_QUIZZES);

  // Pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = allItems.findIndex(item => item.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const items = allItems.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < allItems.length;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  const response: FeedResponse = {
    items,
    nextCursor,
    hasMore,
  };

  return NextResponse.json(response);
}
