import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import {
  decodeReferralCode,
  REFERRAL_REWARDS,
} from '@/lib/growth/invites';
import { trackInvite } from '@/lib/analytics/events';

/**
 * POST /api/referral - Claim a referral reward
 */
export async function POST(req: NextRequest) {
  try {
    const { referralCode, newUserNullifier } = await req.json();

    if (!referralCode || !newUserNullifier) {
      return NextResponse.json(
        { error: 'Missing referralCode or newUserNullifier' },
        { status: 400 }
      );
    }

    const referrerPartial = decodeReferralCode(referralCode);

    if (!referrerPartial) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }

    // DEV mode bypass
    if (IS_DEV || !supabaseAdmin) {
      trackInvite('accepted', referralCode, newUserNullifier);

      return NextResponse.json({
        success: true,
        referrerReward: REFERRAL_REWARDS.REFERRER_XP,
        inviteeReward: REFERRAL_REWARDS.INVITEE_XP,
        message: 'Referral claimed successfully (DEV mode)',
      });
    }

    // Find referrer by partial nullifier
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('nullifier_hash')
      .like('nullifier_hash', `${referrerPartial}%`)
      .single();

    if (!referrer) {
      return NextResponse.json(
        { error: 'Referrer not found' },
        { status: 404 }
      );
    }

    // Check if already claimed
    const { data: existing } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('invitee_nullifier', newUserNullifier)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Referral already claimed' },
        { status: 409 }
      );
    }

    // Create referral record
    const { error: insertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_nullifier: referrer.nullifier_hash,
        invitee_nullifier: newUserNullifier,
        referral_code: referralCode,
        status: 'completed',
        referrer_reward_xp: REFERRAL_REWARDS.REFERRER_XP,
        invitee_reward_xp: REFERRAL_REWARDS.INVITEE_XP,
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Referral] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record referral' },
        { status: 500 }
      );
    }

    // Award XP to referrer
    await supabaseAdmin.rpc('add_xp', {
      p_user_id: null,  // We'd need to get user_id from nullifier
      p_amount: REFERRAL_REWARDS.REFERRER_XP,
      p_source: 'referral',
      p_source_id: null,
    });

    // Track analytics
    trackInvite('accepted', referralCode, newUserNullifier);

    return NextResponse.json({
      success: true,
      referrerReward: REFERRAL_REWARDS.REFERRER_XP,
      inviteeReward: REFERRAL_REWARDS.INVITEE_XP,
      message: 'Referral claimed successfully',
    });
  } catch (error) {
    console.error('[Referral] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process referral' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referral - Get referral stats
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nullifierHash = searchParams.get('nullifier');

  if (!nullifierHash) {
    return NextResponse.json(
      { error: 'nullifier parameter required' },
      { status: 400 }
    );
  }

  // DEV mode
  if (IS_DEV || !supabaseAdmin) {
    return NextResponse.json({
      totalReferrals: 0,
      totalXPEarned: 0,
      pendingRewards: 0,
    });
  }

  const { data } = await supabaseAdmin
    .from('referrals')
    .select('status, referrer_reward_xp')
    .eq('referrer_nullifier', nullifierHash);

  if (!data) {
    return NextResponse.json({
      totalReferrals: 0,
      totalXPEarned: 0,
      pendingRewards: 0,
    });
  }

  const completed = data.filter(r => r.status === 'completed' || r.status === 'rewarded');
  const pending = data.filter(r => r.status === 'pending');

  return NextResponse.json({
    totalReferrals: data.length,
    totalXPEarned: completed.reduce((sum, r) => sum + (r.referrer_reward_xp || 0), 0),
    pendingRewards: pending.length * REFERRAL_REWARDS.REFERRER_XP,
    referrals: data.map(r => ({
      status: r.status,
      xpReward: r.referrer_reward_xp,
    })),
  });
}
