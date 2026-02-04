import { NextResponse } from 'next/server';
import { startQuizSession } from '@/lib/quizStore';
import { checkDailyLimit } from '@/lib/dailyLimitStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, quizId, correctIndex, xpReward } = body;

    if (!userId || !quizId || typeof correctIndex !== 'number' || typeof xpReward !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check daily limits before starting
    const limitCheck = checkDailyLimit(userId, xpReward, 'quiz');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: limitCheck.reason,
          dailyStats: {
            currentXP: limitCheck.currentXP,
            remainingXP: limitCheck.remainingXP,
          },
        },
        { status: 429 }
      );
    }

    const result = startQuizSession(userId, quizId, correctIndex, xpReward);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to start quiz session' },
      { status: 500 }
    );
  }
}
