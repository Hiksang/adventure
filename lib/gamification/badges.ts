/**
 * Badge System
 *
 * Badges reward specific achievements and milestones.
 * Distribution target: 70% common / 25% rare / 5% epic
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';

export type BadgeType =
  // Onboarding (Common)
  | 'FIRST_AD'           // First ad watched
  | 'FIRST_QUIZ'         // First quiz completed
  | 'FIRST_REFERRAL'     // First friend invited

  // Streaks (Common -> Epic)
  | 'STREAK_3'           // 3 day streak
  | 'STREAK_7'           // 7 day streak
  | 'STREAK_14'          // 14 day streak (Rare)
  | 'STREAK_30'          // 30 day streak (Epic)

  // Referrals (Common -> Epic)
  | 'INVITER_BRONZE'     // 3 friends invited
  | 'INVITER_SILVER'     // 5 friends invited (Rare)
  | 'INVITER_GOLD'       // 10 friends invited (Epic)

  // Activity (Common -> Rare)
  | 'QUIZ_MASTER'        // 10 quizzes correct
  | 'AD_WATCHER_100'     // 100 ads watched
  | 'DAILY_GOAL_7'       // Daily goal 7 times

  // XP Milestones (Common -> Epic)
  | 'XP_1000'            // 1000 XP earned
  | 'XP_5000'            // 5000 XP earned (Rare)
  | 'XP_10000'           // 10000 XP earned (Epic)

  // Special (Epic)
  | 'EARLY_ADOPTER'      // First 1000 users
  | 'VERIFIED_HUMAN';    // Orb verified

export type BadgeRarity = 'common' | 'rare' | 'epic';

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  xpReward: number;
}

export interface UserBadge extends Badge {
  earnedAt: string;
  metadata?: Record<string, unknown>;
}

export const BADGES: Record<BadgeType, Badge> = {
  // Onboarding
  FIRST_AD: {
    type: 'FIRST_AD',
    name: 'First View',
    description: 'Watched your first ad',
    icon: '👁️',
    rarity: 'common',
    xpReward: 10,
  },
  FIRST_QUIZ: {
    type: 'FIRST_QUIZ',
    name: 'Quiz Starter',
    description: 'Completed your first quiz',
    icon: '❓',
    rarity: 'common',
    xpReward: 10,
  },
  FIRST_REFERRAL: {
    type: 'FIRST_REFERRAL',
    name: 'Friend Finder',
    description: 'Invited your first friend',
    icon: '👋',
    rarity: 'common',
    xpReward: 25,
  },

  // Streaks
  STREAK_3: {
    type: 'STREAK_3',
    name: 'Getting Started',
    description: '3 day streak',
    icon: '🔥',
    rarity: 'common',
    xpReward: 25,
  },
  STREAK_7: {
    type: 'STREAK_7',
    name: 'Week Warrior',
    description: '7 day streak',
    icon: '⚡',
    rarity: 'common',
    xpReward: 50,
  },
  STREAK_14: {
    type: 'STREAK_14',
    name: 'Dedicated',
    description: '14 day streak',
    icon: '💪',
    rarity: 'rare',
    xpReward: 100,
  },
  STREAK_30: {
    type: 'STREAK_30',
    name: 'Unstoppable',
    description: '30 day streak',
    icon: '🏆',
    rarity: 'epic',
    xpReward: 250,
  },

  // Referrals
  INVITER_BRONZE: {
    type: 'INVITER_BRONZE',
    name: 'Networker',
    description: 'Invited 3 friends',
    icon: '🥉',
    rarity: 'common',
    xpReward: 50,
  },
  INVITER_SILVER: {
    type: 'INVITER_SILVER',
    name: 'Influencer',
    description: 'Invited 5 friends',
    icon: '🥈',
    rarity: 'rare',
    xpReward: 100,
  },
  INVITER_GOLD: {
    type: 'INVITER_GOLD',
    name: 'Ambassador',
    description: 'Invited 10 friends',
    icon: '🥇',
    rarity: 'epic',
    xpReward: 250,
  },

  // Activity
  QUIZ_MASTER: {
    type: 'QUIZ_MASTER',
    name: 'Quiz Master',
    description: '10 quizzes correct',
    icon: '🧠',
    rarity: 'rare',
    xpReward: 75,
  },
  AD_WATCHER_100: {
    type: 'AD_WATCHER_100',
    name: 'Dedicated Viewer',
    description: 'Watched 100 ads',
    icon: '📺',
    rarity: 'rare',
    xpReward: 100,
  },
  DAILY_GOAL_7: {
    type: 'DAILY_GOAL_7',
    name: 'Goal Getter',
    description: 'Daily goal achieved 7 times',
    icon: '🎯',
    rarity: 'rare',
    xpReward: 75,
  },

  // XP Milestones
  XP_1000: {
    type: 'XP_1000',
    name: 'Rising Star',
    description: 'Earned 1,000 XP',
    icon: '⭐',
    rarity: 'common',
    xpReward: 50,
  },
  XP_5000: {
    type: 'XP_5000',
    name: 'XP Hunter',
    description: 'Earned 5,000 XP',
    icon: '🌟',
    rarity: 'rare',
    xpReward: 100,
  },
  XP_10000: {
    type: 'XP_10000',
    name: 'XP Legend',
    description: 'Earned 10,000 XP',
    icon: '💫',
    rarity: 'epic',
    xpReward: 250,
  },

  // Special
  EARLY_ADOPTER: {
    type: 'EARLY_ADOPTER',
    name: 'Early Adopter',
    description: 'Among the first 1,000 users',
    icon: '🌅',
    rarity: 'epic',
    xpReward: 500,
  },
  VERIFIED_HUMAN: {
    type: 'VERIFIED_HUMAN',
    name: 'Verified Human',
    description: 'Orb verified identity',
    icon: '✅',
    rarity: 'epic',
    xpReward: 100,
  },
};

// In-memory store for DEV mode
const devBadges = new Map<string, UserBadge[]>();

/**
 * Award a badge to a user
 */
export async function awardBadge(
  nullifierHash: string,
  badgeType: BadgeType,
  metadata?: Record<string, unknown>
): Promise<{ awarded: boolean; badge: Badge; isNew: boolean }> {
  const badge = BADGES[badgeType];

  if (IS_DEV) {
    const existing = devBadges.get(nullifierHash) || [];
    const hasAlready = existing.some(b => b.type === badgeType);

    if (!hasAlready) {
      existing.push({
        ...badge,
        earnedAt: new Date().toISOString(),
        metadata,
      });
      devBadges.set(nullifierHash, existing);
    }

    return { awarded: true, badge, isNew: !hasAlready };
  }

  if (!supabaseAdmin) {
    return { awarded: false, badge, isNew: false };
  }

  const { data } = await supabaseAdmin.rpc('award_badge', {
    p_nullifier_hash: nullifierHash,
    p_badge_type: badgeType,
    p_metadata: metadata || {},
  });

  return { awarded: true, badge, isNew: !!data };
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(nullifierHash: string): Promise<UserBadge[]> {
  if (IS_DEV) {
    return devBadges.get(nullifierHash) || [];
  }

  if (!supabaseAdmin) return [];

  const { data } = await supabaseAdmin
    .from('user_badges')
    .select('*')
    .eq('nullifier_hash', nullifierHash)
    .order('earned_at', { ascending: false });

  if (!data) return [];

  return data.map(row => ({
    ...BADGES[row.badge_type as BadgeType],
    earnedAt: row.earned_at,
    metadata: row.metadata,
  }));
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(nullifierHash: string, badgeType: BadgeType): Promise<boolean> {
  if (IS_DEV) {
    const badges = devBadges.get(nullifierHash) || [];
    return badges.some(b => b.type === badgeType);
  }

  if (!supabaseAdmin) return false;

  const { data } = await supabaseAdmin
    .from('user_badges')
    .select('id')
    .eq('nullifier_hash', nullifierHash)
    .eq('badge_type', badgeType)
    .single();

  return !!data;
}

/**
 * Check for badges to award based on activity
 */
export async function checkBadgesToAward(
  nullifierHash: string,
  context: {
    adViewCount?: number;
    quizCorrectCount?: number;
    totalXP?: number;
    currentStreak?: number;
    referralCount?: number;
    dailyGoalCount?: number;
    verificationLevel?: 'orb' | 'device';
  }
): Promise<UserBadge[]> {
  const awarded: UserBadge[] = [];

  // First actions
  if (context.adViewCount === 1) {
    const result = await awardBadge(nullifierHash, 'FIRST_AD');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.quizCorrectCount === 1) {
    const result = await awardBadge(nullifierHash, 'FIRST_QUIZ');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.referralCount === 1) {
    const result = await awardBadge(nullifierHash, 'FIRST_REFERRAL');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }

  // Streaks
  if (context.currentStreak === 3) {
    const result = await awardBadge(nullifierHash, 'STREAK_3');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.currentStreak === 7) {
    const result = await awardBadge(nullifierHash, 'STREAK_7');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.currentStreak === 14) {
    const result = await awardBadge(nullifierHash, 'STREAK_14');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.currentStreak === 30) {
    const result = await awardBadge(nullifierHash, 'STREAK_30');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }

  // Referrals
  if (context.referralCount === 3) {
    const result = await awardBadge(nullifierHash, 'INVITER_BRONZE');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.referralCount === 5) {
    const result = await awardBadge(nullifierHash, 'INVITER_SILVER');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.referralCount === 10) {
    const result = await awardBadge(nullifierHash, 'INVITER_GOLD');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }

  // Activity
  if (context.quizCorrectCount === 10) {
    const result = await awardBadge(nullifierHash, 'QUIZ_MASTER');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.adViewCount === 100) {
    const result = await awardBadge(nullifierHash, 'AD_WATCHER_100');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.dailyGoalCount === 7) {
    const result = await awardBadge(nullifierHash, 'DAILY_GOAL_7');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }

  // XP Milestones
  if (context.totalXP && context.totalXP >= 1000) {
    const result = await awardBadge(nullifierHash, 'XP_1000');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.totalXP && context.totalXP >= 5000) {
    const result = await awardBadge(nullifierHash, 'XP_5000');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }
  if (context.totalXP && context.totalXP >= 10000) {
    const result = await awardBadge(nullifierHash, 'XP_10000');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }

  // Special
  if (context.verificationLevel === 'orb') {
    const result = await awardBadge(nullifierHash, 'VERIFIED_HUMAN');
    if (result.isNew) awarded.push({ ...result.badge, earnedAt: new Date().toISOString() });
  }

  return awarded;
}

/**
 * Get rarity color for display
 */
export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common':
      return 'from-gray-400 to-gray-500';
    case 'rare':
      return 'from-blue-400 to-purple-500';
    case 'epic':
      return 'from-yellow-400 to-orange-500';
  }
}
