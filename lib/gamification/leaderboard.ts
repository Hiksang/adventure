/**
 * Weekly Leaderboard System
 *
 * Resets every Monday. Social competition drives engagement.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';

export interface LeaderboardEntry {
  rank: number;
  nullifierHash: string;
  username?: string;  // Optional public name
  weeklyXP: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  currentUserXP: number | null;
  weekStart: string;
  totalParticipants: number;
}

// In-memory store for DEV mode
const devLeaderboard = new Map<string, number>();

/**
 * Get current week's start date (Monday)
 */
export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Update user's weekly XP
 */
export async function updateWeeklyXP(nullifierHash: string, xpAmount: number): Promise<void> {
  if (IS_DEV) {
    const current = devLeaderboard.get(nullifierHash) || 0;
    devLeaderboard.set(nullifierHash, current + xpAmount);
    return;
  }

  if (!supabaseAdmin) return;

  await supabaseAdmin.rpc('update_weekly_leaderboard', {
    p_nullifier_hash: nullifierHash,
    p_xp_amount: xpAmount,
  });
}

/**
 * Get the weekly leaderboard
 */
export async function getLeaderboard(
  currentUserNullifier?: string,
  limit: number = 100
): Promise<LeaderboardData> {
  const weekStart = getWeekStart();

  if (IS_DEV) {
    return getLeaderboardDev(currentUserNullifier, limit, weekStart);
  }

  if (!supabaseAdmin) {
    return {
      entries: [],
      currentUserRank: null,
      currentUserXP: null,
      weekStart,
      totalParticipants: 0,
    };
  }

  // Get leaderboard entries
  const { data: entries } = await supabaseAdmin.rpc('get_weekly_leaderboard', {
    p_limit: limit,
  });

  // Get total participants
  const { count } = await supabaseAdmin
    .from('weekly_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('week_start', weekStart);

  // Find current user's position if not in top
  let currentUserRank: number | null = null;
  let currentUserXP: number | null = null;

  if (currentUserNullifier) {
    const userEntry = entries?.find((e: { nullifier_hash: string }) => e.nullifier_hash === currentUserNullifier);

    if (userEntry) {
      currentUserRank = Number(userEntry.rank);
      currentUserXP = userEntry.weekly_xp;
    } else {
      // User not in top, get their position
      const { data: userData } = await supabaseAdmin
        .from('weekly_leaderboard')
        .select('weekly_xp')
        .eq('nullifier_hash', currentUserNullifier)
        .eq('week_start', weekStart)
        .single();

      if (userData) {
        currentUserXP = userData.weekly_xp;

        // Count users with more XP
        const { count: higherCount } = await supabaseAdmin
          .from('weekly_leaderboard')
          .select('*', { count: 'exact', head: true })
          .eq('week_start', weekStart)
          .gt('weekly_xp', userData.weekly_xp);

        currentUserRank = (higherCount || 0) + 1;
      }
    }
  }

  return {
    entries: (entries || []).map((e: { rank: number; nullifier_hash: string; weekly_xp: number }) => ({
      rank: Number(e.rank),
      nullifierHash: e.nullifier_hash,
      weeklyXP: e.weekly_xp,
      isCurrentUser: e.nullifier_hash === currentUserNullifier,
    })),
    currentUserRank,
    currentUserXP,
    weekStart,
    totalParticipants: count || 0,
  };
}

function getLeaderboardDev(
  currentUserNullifier: string | undefined,
  limit: number,
  weekStart: string
): LeaderboardData {
  const entries: LeaderboardEntry[] = [];
  const sorted = Array.from(devLeaderboard.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  sorted.forEach(([nullifier, xp], index) => {
    entries.push({
      rank: index + 1,
      nullifierHash: nullifier,
      weeklyXP: xp,
      isCurrentUser: nullifier === currentUserNullifier,
    });
  });

  const currentEntry = entries.find(e => e.isCurrentUser);

  return {
    entries,
    currentUserRank: currentEntry?.rank || null,
    currentUserXP: currentEntry?.weeklyXP || null,
    weekStart,
    totalParticipants: devLeaderboard.size,
  };
}

/**
 * Get user's rank change since yesterday
 */
export async function getRankChange(nullifierHash: string): Promise<{
  change: number;
  direction: 'up' | 'down' | 'same';
} | null> {
  // Simplified - in production, would compare with stored yesterday's rank
  return null;
}

/**
 * Format rank for display
 */
export function formatRank(rank: number): string {
  if (rank === 1) return '🥇 1st';
  if (rank === 2) return '🥈 2nd';
  if (rank === 3) return '🥉 3rd';
  return `#${rank}`;
}

/**
 * Get percentile for rank
 */
export function getPercentile(rank: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((1 - (rank - 1) / total) * 100);
}

/**
 * Get rank tier
 */
export function getRankTier(rank: number, total: number): {
  name: string;
  color: string;
  emoji: string;
} {
  const percentile = getPercentile(rank, total);

  if (percentile >= 99) {
    return { name: 'Champion', color: 'text-yellow-400', emoji: '👑' };
  }
  if (percentile >= 95) {
    return { name: 'Diamond', color: 'text-cyan-400', emoji: '💎' };
  }
  if (percentile >= 90) {
    return { name: 'Platinum', color: 'text-purple-400', emoji: '💜' };
  }
  if (percentile >= 75) {
    return { name: 'Gold', color: 'text-yellow-500', emoji: '🥇' };
  }
  if (percentile >= 50) {
    return { name: 'Silver', color: 'text-gray-400', emoji: '🥈' };
  }
  if (percentile >= 25) {
    return { name: 'Bronze', color: 'text-orange-400', emoji: '🥉' };
  }
  return { name: 'Starter', color: 'text-white/60', emoji: '🌱' };
}
