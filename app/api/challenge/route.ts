import { NextResponse } from 'next/server';
import { checkIfChallengeNeeded, CHALLENGE_CONFIG } from '@/lib/challengeStore';

// Check if user needs to complete a challenge
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = checkIfChallengeNeeded(userId);

    if (result.isLocked) {
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          lockRemainingMs: result.lockRemainingMs,
          error: 'USER_TEMPORARILY_LOCKED',
        },
        { status: 429 }
      );
    }

    if (result.needsChallenge && result.challenge) {
      return NextResponse.json({
        success: true,
        needsChallenge: true,
        challenge: result.challenge,
      });
    }

    return NextResponse.json({
      success: true,
      needsChallenge: false,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to check challenge status' },
      { status: 500 }
    );
  }
}

// Get challenge configuration
export async function GET() {
  return NextResponse.json({
    viewsBeforeChallenge: CHALLENGE_CONFIG.VIEWS_BEFORE_CHALLENGE,
    challengeTimeoutMs: CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
    maxFailedAttempts: CHALLENGE_CONFIG.MAX_FAILED_ATTEMPTS,
    lockDurationMs: CHALLENGE_CONFIG.LOCK_DURATION_MS,
  });
}
