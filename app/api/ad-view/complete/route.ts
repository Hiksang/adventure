import { NextResponse, NextRequest } from 'next/server';
import { completeAdView, getStats } from '@/lib/adViewStore';
import { checkDailyLimit, recordXPEarned, getDailyStats } from '@/lib/dailyLimitStore';
import { supabaseAdmin } from '@/lib/supabase/server';
import { behaviorTracker, shouldChallenge, shouldBlock } from '@/lib/antiAbuse/detector';
import { updateWeeklyXP } from '@/lib/gamification/leaderboard';
import { checkBadgesToAward } from '@/lib/gamification/badges';
import { trackAdView } from '@/lib/analytics/events';
import { earnCredits, getCreditConfig } from '@/lib/credits/service';
import { checkCombinedRateLimit, getClientIP } from '@/lib/security/rateLimit';
import {
  parseJsonBody,
  validateAdViewRequest,
  validationError,
} from '@/lib/security/validation';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const { data: body, error: parseError } = await parseJsonBody<{
      userId: string;
      adId: string;
      viewToken: string;
      expectedXP: number;
      nullifierHash: string;
      viewDuration?: number;
    }>(request);

    if (parseError || !body) {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST', message: parseError || 'Invalid request' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateAdViewRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: validation.errors },
        { status: 400 }
      );
    }

    const { userId, adId, viewToken, expectedXP, nullifierHash, viewDuration } = validation.data!;

    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResponse = checkCombinedRateLimit(nullifierHash, ip, 'adView');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Record behavior for anti-abuse analysis
    if (viewDuration) {
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
          creditsAwarded: 0,
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
          creditsAwarded: 0,
          xpAwarded: 0,
        },
        { status: 400 }
      );
    }

    // Earn credits for the ad view
    const creditResult = await earnCredits({
      nullifierHash,
      userId,
      type: 'ad_view',
      referenceId: adId,
    });

    // Record XP earned for daily tracking (keep for limit tracking)
    recordXPEarned(userId, result.xpAwarded, 'ad');

    // Update daily view stats (privacy-preserving: only aggregates)
    if (supabaseAdmin) {
      await supabaseAdmin.rpc('increment_daily_view', {
        p_nullifier_hash: nullifierHash,
        p_xp_amount: result.xpAwarded,
      });
    }

    // Update weekly leaderboard
    await updateWeeklyXP(nullifierHash, result.xpAwarded);

    // Check for badges to award
    const dailyStats = getDailyStats(userId);
    await checkBadgesToAward(nullifierHash, {
      adViewCount: dailyStats.adViews,
      totalXP: dailyStats.xpEarned,
    });

    // Track analytics
    trackAdView('complete', adId, result.xpAwarded, nullifierHash);

    // Check if challenge needed
    const challengeCheck = shouldChallenge(nullifierHash);

    console.log('[AdView] Credits awarded:', {
      userId,
      adId,
      credits: creditResult.creditsEarned,
      newBalance: creditResult.newBalance,
      xp: result.xpAwarded,
      dailyTotal: dailyStats.xpEarned,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      creditsAwarded: creditResult.creditsEarned,
      newCreditBalance: creditResult.newBalance,
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
  } catch (error) {
    console.error('[AdView] Error:', error);
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
