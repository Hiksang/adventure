/**
 * Invite & Referral System
 *
 * Two-sided rewards: both referrer and invitee get bonuses.
 * PayPal-style approach: 7-10% daily growth target.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV, APP_ID } from '@/lib/env';
import { MiniKit } from '@worldcoin/minikit-js';

// Reward configuration
export const REFERRAL_REWARDS = {
  REFERRER_XP: 100,
  INVITEE_XP: 100,
  REFERRER_BADGE_THRESHOLD: [3, 5, 10],  // Bronze, Silver, Gold
};

// In-memory store for DEV mode
const devReferrals = new Map<string, {
  referrerNullifier: string;
  inviteeNullifier: string;
  status: string;
  createdAt: string;
}>();

/**
 * Encode a referral code from nullifier hash
 * Uses base64 encoding with slight obfuscation
 */
export function encodeReferralCode(nullifierHash: string): string {
  // Take first 8 chars of nullifier and add timestamp suffix
  const short = nullifierHash.slice(0, 8);
  const timestamp = Date.now().toString(36).slice(-4);
  return btoa(`${short}:${timestamp}`).replace(/=/g, '');
}

/**
 * Decode a referral code back to partial nullifier
 */
export function decodeReferralCode(code: string): string | null {
  try {
    const decoded = atob(code + '=='.slice(0, (4 - code.length % 4) % 4));
    const [short] = decoded.split(':');
    return short;
  } catch {
    return null;
  }
}

/**
 * Generate invite link
 */
export function generateInviteLink(referrerNullifier: string): string {
  const refCode = encodeReferralCode(referrerNullifier);

  if (IS_DEV) {
    return `http://localhost:3000/invite/${refCode}`;
  }

  // World App deep link format
  return `https://world.org/mini-app?app_id=${APP_ID}&path=/invite/${refCode}`;
}

/**
 * Trigger native share dialog (client-side)
 */
export async function shareInviteLink(referrerNullifier: string): Promise<boolean> {
  const inviteLink = generateInviteLink(referrerNullifier);

  if (IS_DEV) {
    console.log('[Invite] Share link:', inviteLink);
    return true;
  }

  try {
    await MiniKit.commandsAsync.share({
      title: 'Join AdWatch',
      text: 'Watch ads, earn rewards! Only for verified humans. Sign up and we both get 100 XP bonus! 🎁',
      url: inviteLink,
    });
    return true;
  } catch (error) {
    console.error('[Invite] Share failed:', error);

    // Fallback to Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join AdWatch',
          text: 'Watch ads, earn rewards! Sign up and we both get 100 XP bonus!',
          url: inviteLink,
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

/**
 * Store a referral code for later claiming
 */
export async function storeReferralCode(
  referralCode: string,
  referrerPartialNullifier: string
): Promise<boolean> {
  if (IS_DEV) {
    return true;
  }

  // In production, store in session or local storage
  // until user completes signup
  if (typeof window !== 'undefined') {
    localStorage.setItem('pending_referral', JSON.stringify({
      code: referralCode,
      referrer: referrerPartialNullifier,
      timestamp: Date.now(),
    }));
  }

  return true;
}

/**
 * Claim referral reward when new user signs up
 */
export async function claimReferral(
  inviteeNullifier: string,
  referralCode: string
): Promise<{
  success: boolean;
  referrerReward?: number;
  inviteeReward?: number;
  error?: string;
}> {
  const referrerPartial = decodeReferralCode(referralCode);

  if (!referrerPartial) {
    return { success: false, error: 'Invalid referral code' };
  }

  if (IS_DEV) {
    devReferrals.set(inviteeNullifier, {
      referrerNullifier: referrerPartial,
      inviteeNullifier,
      status: 'rewarded',
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      referrerReward: REFERRAL_REWARDS.REFERRER_XP,
      inviteeReward: REFERRAL_REWARDS.INVITEE_XP,
    };
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Database not configured' };
  }

  // Find referrer by partial nullifier
  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('nullifier_hash')
    .like('nullifier_hash', `${referrerPartial}%`)
    .single();

  if (!referrer) {
    return { success: false, error: 'Referrer not found' };
  }

  // Check if already claimed
  const { data: existing } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('invitee_nullifier', inviteeNullifier)
    .single();

  if (existing) {
    return { success: false, error: 'Referral already claimed' };
  }

  // Create referral record
  const { error: insertError } = await supabaseAdmin
    .from('referrals')
    .insert({
      referrer_nullifier: referrer.nullifier_hash,
      invitee_nullifier: inviteeNullifier,
      referral_code: referralCode,
      status: 'rewarded',
      referrer_reward_xp: REFERRAL_REWARDS.REFERRER_XP,
      invitee_reward_xp: REFERRAL_REWARDS.INVITEE_XP,
      completed_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[Referral] Insert error:', insertError);
    return { success: false, error: 'Failed to record referral' };
  }

  // Award XP to both (would need to implement XP adding)
  // In production, call add_xp function for both users

  return {
    success: true,
    referrerReward: REFERRAL_REWARDS.REFERRER_XP,
    inviteeReward: REFERRAL_REWARDS.INVITEE_XP,
  };
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(nullifierHash: string): Promise<{
  totalReferrals: number;
  totalXPEarned: number;
  pendingRewards: number;
}> {
  if (IS_DEV) {
    const referrals = Array.from(devReferrals.values()).filter(
      r => r.referrerNullifier === nullifierHash.slice(0, 8)
    );
    return {
      totalReferrals: referrals.length,
      totalXPEarned: referrals.length * REFERRAL_REWARDS.REFERRER_XP,
      pendingRewards: 0,
    };
  }

  if (!supabaseAdmin) {
    return { totalReferrals: 0, totalXPEarned: 0, pendingRewards: 0 };
  }

  const { data } = await supabaseAdmin
    .from('referrals')
    .select('status, referrer_reward_xp')
    .eq('referrer_nullifier', nullifierHash);

  if (!data) {
    return { totalReferrals: 0, totalXPEarned: 0, pendingRewards: 0 };
  }

  const completed = data.filter(r => r.status === 'rewarded');
  const pending = data.filter(r => r.status === 'pending');

  return {
    totalReferrals: data.length,
    totalXPEarned: completed.reduce((sum, r) => sum + (r.referrer_reward_xp || 0), 0),
    pendingRewards: pending.length * REFERRAL_REWARDS.REFERRER_XP,
  };
}

/**
 * Get pending referral from local storage
 */
export function getPendingReferral(): { code: string; referrer: string } | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('pending_referral');
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Expire after 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('pending_referral');
      return null;
    }

    return { code: data.code, referrer: data.referrer };
  } catch {
    return null;
  }
}

/**
 * Clear pending referral
 */
export function clearPendingReferral(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pending_referral');
  }
}
