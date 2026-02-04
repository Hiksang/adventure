/**
 * Streak System
 *
 * Inspired by Duolingo's streak system which improved D1 retention from 12% to 55%.
 * Users maintain streaks by being active daily.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';

export interface UserStreak {
  nullifierHash: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakStartDate: string | null;
}

export interface StreakUpdateResult {
  streakExtended: boolean;
  newStreak: number;
  milestone: number | null;  // 3, 7, 14, 30, etc.
}

// In-memory store for DEV mode
const devStreaks = new Map<string, UserStreak>();

/**
 * Get user's current streak data
 */
export async function getStreak(nullifierHash: string): Promise<UserStreak | null> {
  if (IS_DEV) {
    return devStreaks.get(nullifierHash) || null;
  }

  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('user_streaks')
    .select('*')
    .eq('nullifier_hash', nullifierHash)
    .single();

  if (!data) return null;

  return {
    nullifierHash: data.nullifier_hash,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActiveDate: data.last_active_date,
    streakStartDate: data.streak_start_date,
  };
}

/**
 * Update streak when user is active
 */
export async function updateStreak(nullifierHash: string): Promise<StreakUpdateResult> {
  if (IS_DEV) {
    return updateStreakDev(nullifierHash);
  }

  if (!supabaseAdmin) {
    return { streakExtended: false, newStreak: 0, milestone: null };
  }

  const { data, error } = await supabaseAdmin
    .rpc('update_user_streak', { p_nullifier_hash: nullifierHash });

  if (error || !data || data.length === 0) {
    console.error('[Streaks] Update error:', error);
    return { streakExtended: false, newStreak: 0, milestone: null };
  }

  const result = data[0];
  return {
    streakExtended: result.streak_extended,
    newStreak: result.new_streak,
    milestone: result.milestone,
  };
}

function updateStreakDev(nullifierHash: string): StreakUpdateResult {
  const today = new Date().toISOString().split('T')[0];
  const existing = devStreaks.get(nullifierHash);

  if (!existing) {
    devStreaks.set(nullifierHash, {
      nullifierHash,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      streakStartDate: today,
    });
    return { streakExtended: true, newStreak: 1, milestone: 1 };
  }

  if (existing.lastActiveDate === today) {
    return { streakExtended: false, newStreak: existing.currentStreak, milestone: null };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (existing.lastActiveDate === yesterdayStr) {
    // Streak continues
    existing.currentStreak += 1;
    if (existing.currentStreak > existing.longestStreak) {
      existing.longestStreak = existing.currentStreak;
    }
    existing.lastActiveDate = today;

    const milestone = [3, 7, 14, 30, 60, 90, 365].includes(existing.currentStreak)
      ? existing.currentStreak
      : null;

    return { streakExtended: true, newStreak: existing.currentStreak, milestone };
  } else {
    // Streak broken
    existing.currentStreak = 1;
    existing.lastActiveDate = today;
    existing.streakStartDate = today;
    return { streakExtended: true, newStreak: 1, milestone: null };
  }
}

/**
 * Check if user's streak is at risk (not active today)
 */
export async function isStreakAtRisk(nullifierHash: string): Promise<boolean> {
  const streak = await getStreak(nullifierHash);
  if (!streak || streak.currentStreak === 0) return false;

  const today = new Date().toISOString().split('T')[0];
  return streak.lastActiveDate !== today;
}

/**
 * Get streak milestone message
 */
export function getStreakMilestoneMessage(milestone: number): {
  title: string;
  description: string;
  emoji: string;
  xpBonus: number;
} {
  switch (milestone) {
    case 3:
      return {
        title: '3 Day Streak!',
        description: 'You\'re building a habit. Keep it up!',
        emoji: '🔥',
        xpBonus: 25,
      };
    case 7:
      return {
        title: 'Week Streak!',
        description: 'A full week of daily activity!',
        emoji: '⚡',
        xpBonus: 50,
      };
    case 14:
      return {
        title: '2 Week Streak!',
        description: 'You\'re on fire!',
        emoji: '💪',
        xpBonus: 100,
      };
    case 30:
      return {
        title: 'Month Streak!',
        description: 'Incredible dedication!',
        emoji: '🏆',
        xpBonus: 250,
      };
    case 60:
      return {
        title: '2 Month Streak!',
        description: 'You\'re a legend!',
        emoji: '👑',
        xpBonus: 500,
      };
    case 90:
      return {
        title: '3 Month Streak!',
        description: 'Unstoppable!',
        emoji: '💎',
        xpBonus: 1000,
      };
    case 365:
      return {
        title: 'Year Streak!',
        description: 'Absolutely phenomenal!',
        emoji: '🌟',
        xpBonus: 5000,
      };
    default:
      return {
        title: `${milestone} Day Streak!`,
        description: 'Keep the streak alive!',
        emoji: '🔥',
        xpBonus: Math.min(milestone * 5, 100),
      };
  }
}

/**
 * Format streak for display
 */
export function formatStreak(streak: number): string {
  if (streak === 0) return 'No streak';
  if (streak === 1) return '1 day';
  return `${streak} days`;
}
