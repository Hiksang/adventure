import { NextResponse } from 'next/server';
import { verifyChallenge, skipChallenge } from '@/lib/challengeStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, challengeId, answer, skip } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Handle skip
    if (skip) {
      skipChallenge(userId);
      console.warn('[Challenge] User skipped challenge:', {
        userId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        success: false,
        error: 'CHALLENGE_SKIPPED',
        message: 'Challenge skipped - no XP awarded for next views',
      });
    }

    if (!challengeId || answer === undefined) {
      return NextResponse.json(
        { success: false, error: 'challengeId and answer are required' },
        { status: 400 }
      );
    }

    const result = verifyChallenge(userId, challengeId, answer);

    if (!result.success) {
      console.warn('[Challenge] Verification failed:', {
        userId,
        challengeId,
        error: result.error,
        isLocked: result.isLocked,
        timestamp: new Date().toISOString(),
      });

      const status = result.isLocked ? 429 : 400;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          isLocked: result.isLocked,
          lockRemainingMs: result.lockRemainingMs,
        },
        { status }
      );
    }

    console.log('[Challenge] Verification successful:', {
      userId,
      challengeId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Challenge completed successfully',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to verify challenge' },
      { status: 500 }
    );
  }
}
