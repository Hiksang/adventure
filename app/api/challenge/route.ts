import { NextResponse } from 'next/server';
import { checkIfChallengeNeeded, CHALLENGE_CONFIG } from '@/lib/challengeStore';
import { behaviorTracker, shouldChallenge as checkBehavior, THRESHOLDS } from '@/lib/antiAbuse/detector';
import { getPendingReVerification, requestReVerification } from '@/lib/antiAbuse/reVerification';

// Check if user needs to complete a challenge
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, nullifierHash } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check for pending re-verification
    if (nullifierHash) {
      const pendingReverify = getPendingReVerification(nullifierHash);
      if (pendingReverify) {
        return NextResponse.json({
          success: false,
          needsReVerification: true,
          reVerificationAction: pendingReverify.action,
          reason: pendingReverify.reason,
          error: 'RE_VERIFICATION_REQUIRED',
        }, { status: 403 });
      }
    }

    // Check behavior-based challenge need
    if (nullifierHash) {
      const behaviorCheck = checkBehavior(nullifierHash);

      if (behaviorCheck.shouldChallenge && behaviorCheck.analysis) {
        // If suspicion is very high, require World ID re-verification
        if (behaviorCheck.analysis.suspicionScore >= THRESHOLDS.SUSPICION_REVERIFY) {
          const reVerifyRequest = requestReVerification(nullifierHash, 'suspicious_behavior');

          return NextResponse.json({
            success: false,
            needsReVerification: true,
            reVerificationAction: reVerifyRequest.action,
            reason: 'suspicious_behavior',
            suspicionScore: behaviorCheck.analysis.suspicionScore,
            flags: behaviorCheck.analysis.flags,
            error: 'RE_VERIFICATION_REQUIRED',
          }, { status: 403 });
        }

        // Otherwise, return a regular challenge with increased difficulty
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

        // Force challenge due to behavior
        return NextResponse.json({
          success: true,
          needsChallenge: true,
          challenge: result.challenge || generateBehaviorChallenge(behaviorCheck.analysis.suspicionScore),
          reason: behaviorCheck.reason,
          behaviorFlags: behaviorCheck.analysis.flags,
        });
      }
    }

    // Standard challenge check
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

// Generate a harder challenge based on suspicion level
function generateBehaviorChallenge(suspicionScore: number) {
  const challengeTypes = ['tap', 'math', 'swipe', 'sequence'];

  // Higher suspicion = harder challenge
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  if (suspicionScore >= 70) {
    difficulty = 'hard';
  } else if (suspicionScore >= 50) {
    difficulty = 'medium';
  }

  const challenges = {
    easy: {
      type: challengeTypes[Math.floor(Math.random() * 2)], // tap or math
      question: 'Tap the button to continue',
      timeoutMs: 10000,
    },
    medium: {
      type: 'math',
      question: generateMathQuestion('medium'),
      options: generateMathOptions('medium'),
      timeoutMs: 8000,
    },
    hard: {
      type: 'sequence',
      question: 'Tap the numbers in order: 1, 2, 3, 4',
      options: ['3', '1', '4', '2'].sort(() => Math.random() - 0.5),
      timeoutMs: 6000,
    },
  };

  return {
    id: `behavior-${Date.now()}`,
    ...challenges[difficulty],
  };
}

function generateMathQuestion(difficulty: 'easy' | 'medium' | 'hard'): string {
  let a: number, b: number, op: string;

  if (difficulty === 'easy') {
    a = Math.floor(Math.random() * 10) + 1;
    b = Math.floor(Math.random() * 10) + 1;
    op = '+';
  } else if (difficulty === 'medium') {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * 10) + 1;
    op = Math.random() > 0.5 ? '+' : '-';
  } else {
    a = Math.floor(Math.random() * 12) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    op = '×';
  }

  return `${a} ${op} ${b} = ?`;
}

function generateMathOptions(difficulty: 'easy' | 'medium' | 'hard'): string[] {
  const question = generateMathQuestion(difficulty);
  const parts = question.replace(' = ?', '').split(' ');
  const a = parseInt(parts[0]);
  const op = parts[1];
  const b = parseInt(parts[2]);

  let correct: number;
  if (op === '+') correct = a + b;
  else if (op === '-') correct = a - b;
  else correct = a * b;

  const options = new Set<number>([correct]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    if (offset !== 0) options.add(correct + offset);
  }

  return Array.from(options)
    .sort(() => Math.random() - 0.5)
    .map(String);
}

// Get challenge configuration
export async function GET() {
  return NextResponse.json({
    viewsBeforeChallenge: CHALLENGE_CONFIG.VIEWS_BEFORE_CHALLENGE,
    challengeTimeoutMs: CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
    maxFailedAttempts: CHALLENGE_CONFIG.MAX_FAILED_ATTEMPTS,
    lockDurationMs: CHALLENGE_CONFIG.LOCK_DURATION_MS,
    behaviorThresholds: {
      challenge: THRESHOLDS.SUSPICION_CHALLENGE,
      reVerify: THRESHOLDS.SUSPICION_REVERIFY,
      block: THRESHOLDS.SUSPICION_BLOCK,
    },
  });
}
