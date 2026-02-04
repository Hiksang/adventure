import { NextResponse } from 'next/server';
import { IS_DEV } from '@/lib/env';
import type { Streak, Badge, DailyGoal, LeaderboardEntry } from '@/types';

const MOCK_STREAK: Streak = { current: 5, max: 12 };

const MOCK_BADGES: Badge[] = [
  { id: '1', name: 'First Ad', icon: '📺', unlocked: true },
  { id: '2', name: 'Quiz Master', icon: '🧠', unlocked: true },
  { id: '3', name: '5-Day Streak', icon: '🔥', unlocked: true },
  { id: '4', name: 'Level 5', icon: '⭐', unlocked: true },
  { id: '5', name: 'Code Cracker', icon: '🔓', unlocked: false },
  { id: '6', name: '10 Ads', icon: '🎬', unlocked: false },
  { id: '7', name: 'Early Bird', icon: '🐦', unlocked: false },
  { id: '8', name: 'WLD Holder', icon: '💰', unlocked: false },
];

const MOCK_DAILY_GOAL: DailyGoal = {
  ads: { current: 2, target: 3 },
  activities: { current: 0, target: 1 },
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  username: ['CryptoKing', 'DeFiQueen', 'WorldExplorer', 'BlockMaster', 'TokenHunter', 'ChainWiz', 'MoonRider', 'HashHero', 'StakeKing', 'NodeRunner'][i],
  xp: 5000 - i * 350,
  level: 10 - i,
}));

export async function GET() {
  if (IS_DEV) {
    return NextResponse.json({
      streak: MOCK_STREAK,
      badges: MOCK_BADGES,
      dailyGoal: MOCK_DAILY_GOAL,
      leaderboard: MOCK_LEADERBOARD,
    });
  }

  // Production: fetch from database
  return NextResponse.json({ streak: { current: 0, max: 0 }, badges: [], dailyGoal: { ads: { current: 0, target: 3 }, activities: { current: 0, target: 1 } }, leaderboard: [] });
}
