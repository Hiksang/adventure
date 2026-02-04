import { NextResponse } from 'next/server';
import type { FeedItem, FeedResponse } from '@/types';

const MOCK_FEED_ITEMS: FeedItem[] = [
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
    id: 'ad-1',
    type: 'ad',
    ad: {
      id: 'ad-1',
      title: 'New Galaxy S25 Ultra',
      brand: 'Samsung',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
      xp_reward: 50,
      duration_seconds: 5,
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
    id: 'quiz-1',
    type: 'quiz',
    quiz: {
      id: 'quiz-1',
      question: 'What is the display size of the Galaxy S25 Ultra?',
      options: ['6.2 inch', '6.8 inch', '7.2 inch', '6.5 inch'],
      correct_index: 1,
      xp_reward: 25,
      related_ad_id: 'ad-1',
    },
  },
  {
    id: 'ad-2',
    type: 'ad',
    ad: {
      id: 'ad-2',
      title: 'Starbucks Winter Menu',
      brand: 'Starbucks',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',
      xp_reward: 50,
      duration_seconds: 5,
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
  {
    id: 'ad-3',
    type: 'ad',
    ad: {
      id: 'ad-3',
      title: 'Nike Air Max 2025',
      brand: 'Nike',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      xp_reward: 50,
      duration_seconds: 5,
    },
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '10');

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = MOCK_FEED_ITEMS.findIndex(item => item.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const items = MOCK_FEED_ITEMS.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < MOCK_FEED_ITEMS.length;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  const response: FeedResponse = {
    items,
    nextCursor,
    hasMore,
  };

  return NextResponse.json(response);
}
