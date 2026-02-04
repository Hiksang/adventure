import { NextResponse } from 'next/server';
import { completeAdView, getStats } from '@/lib/adViewStore';
import { checkDailyLimit, recordXPEarned, getDailyStats } from '@/lib/dailyLimitStore';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import { behaviorTracker, shouldChallenge, shouldBlock } from '@/lib/antiAbuse/detector';
import { updateWeeklyXP } from '@/lib/gamification/leaderboard';
import { checkBadgesToAward } from '@/lib/gamification/badges';
import { trackAdView } from '@/lib/analytics/events';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, adId, viewToken, expectedXP, nullifierHash, viewDuration } = body;

    // World ID required (except in DEV mode)
    if (!IS_DEV && !nullifierHash) {
      return NextResponse.json(
        { success: false, error: 'WORLD_ID_REQUIRED', message: 'World ID verification is required' },
        { status: 401 }
      );
    }

    if (!userId || !adId || !viewToken || typeof expectedXP !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, adId, viewToken, expectedXP' },
        { status: 400 }
      );
    }

    // Record behavior for anti-abuse analysis
    if (nullifierHash && viewDuration) {
      behaviorTracker.recordView(nullifierHash, {
        timestamp: Date.now(),
        duration: viewDuration,
        adId,
      });

      // Check if user should be blocked
      if (shouldBlock(nullifierHash)) {
        console.warn('[AdView] User blocked due to suspicious behavior:', nullifierHash);
        return NextResponse.json(
          { success: false, error: 'ACCOUNT_RESTRICTED', message: 'Please verify with World ID again' },
          { status: 403 }
        );
      }
    }

    // Check daily limits first
    const limitCheck = checkDailyLimit(userId, expectedXP, 'ad');
    if (!limitCheck.allowed) {
      console.warn('[AdView] Daily limit reached:', {
        userId,
        adId,
        reason: limitCheck.reason,
        currentXP: limitCheck.currentXP,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: limitCheck.reason,
          xpAwarded: 0,
          dailyStats: {
            currentXP: limitCheck.currentXP,
            remainingXP: limitCheck.remainingXP,
            currentAdViews: limitCheck.currentAdViews,
            remainingAdViews: limitCheck.remainingAdViews,
          },
        },
        { status: 429 }
      );
    }

    const result = completeAdView(userId, adId, viewToken, expectedXP);

    if (!result.success) {
      // Log suspicious activity
      console.warn('[AdView] Failed completion attempt:', {
        userId,
        adId,
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          xpAwarded: 0,
        },
        { status: 400 }
      );
    }

    // Record XP earned for daily tracking
    recordXPEarned(userId, result.xpAwarded, 'ad');

    // Update daily view stats (privacy-preserving: only aggregates)
    if (nullifierHash && supabaseAdmin) {
      await supabaseAdmin.rpc('increment_daily_view', {
        p_nullifier_hash: nullifierHash,
        p_xp_amount: result.xpAwarded,
      });
    }

    // Update weekly leaderboard
    if (nullifierHash) {
      await updateWeeklyXP(nullifierHash, result.xpAwarded);
    }

    // Check for badges to award
    if (nullifierHash) {
      const dailyStats = getDailyStats(userId);
      await checkBadgesToAward(nullifierHash, {
        adViewCount: dailyStats.adViews,
        totalXP: dailyStats.xpEarned,
      });
    }

    // Track analytics
    trackAdView('complete', adId, result.xpAwarded, nullifierHash);

    // Get updated daily stats
    const dailyStats = getDailyStats(userId);

    // Check if challenge needed
    const challengeCheck = nullifierHash ? shouldChallenge(nullifierHash) : { shouldChallenge: false };

    console.log('[AdView] XP awarded:', {
      userId,
      adId,
      xp: result.xpAwarded,
      dailyTotal: dailyStats.xpEarned,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      xpAwarded: result.xpAwarded,
      message: 'Ad view completed',
      dailyStats: {
        currentXP: dailyStats.xpEarned,
        remainingXP: dailyStats.limits.MAX_XP_PER_DAY - dailyStats.xpEarned,
        currentAdViews: dailyStats.adViews,
        remainingAdViews: dailyStats.limits.MAX_AD_VIEWS_PER_DAY - dailyStats.adViews,
      },
      challengeRequired: challengeCheck.shouldChallenge,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to complete ad view' },
      { status: 500 }
    );
  }
}

// GET endpoint for monitoring (optional)
export async function GET() {
  const stats = getStats();
  return NextResponse.json({ stats });
}
