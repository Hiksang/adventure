import { NextResponse } from 'next/server';
import { submitQuizAnswer } from '@/lib/quizStore';
import { checkDailyLimit, recordXPEarned, getDailyStats } from '@/lib/dailyLimitStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, quizId, selectedIndex, expectedXP } = body;

    if (!userId || !quizId || typeof selectedIndex !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check daily limits
    const limitCheck = checkDailyLimit(userId, expectedXP || 25, 'quiz');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: limitCheck.reason,
          xpAwarded: 0,
          dailyStats: {
            currentXP: limitCheck.currentXP,
            remainingXP: limitCheck.remainingXP,
          },
        },
        { status: 429 }
      );
    }

    const result = submitQuizAnswer(userId, quizId, selectedIndex);

    if (!result.success) {
      console.warn('[Quiz] Failed answer attempt:', {
        userId,
        quizId,
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

    // Record XP if earned
    if (result.xpAwarded > 0) {
      recordXPEarned(userId, result.xpAwarded, 'quiz');
    }

    // Get updated daily stats
    const dailyStats = getDailyStats(userId);

    console.log('[Quiz] Answer submitted:', {
      userId,
      quizId,
      correct: result.correct,
      xp: result.xpAwarded,
      dailyTotal: dailyStats.xpEarned,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      correct: result.correct,
      xpAwarded: result.xpAwarded,
      dailyStats: {
        currentXP: dailyStats.xpEarned,
        remainingXP: dailyStats.limits.MAX_XP_PER_DAY - dailyStats.xpEarned,
        quizAnswers: dailyStats.quizAnswers,
        remainingQuizzes: dailyStats.limits.MAX_QUIZ_PER_DAY - dailyStats.quizAnswers,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to submit quiz answer' },
      { status: 500 }
    );
  }
}
