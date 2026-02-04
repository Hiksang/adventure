import { NextResponse } from 'next/server';
import { getDailyStats, DAILY_LIMITS } from '@/lib/dailyLimitStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const stats = getDailyStats(userId);

    return NextResponse.json({
      success: true,
      stats: {
        date: stats.date,
        xpEarned: stats.xpEarned,
        adViews: stats.adViews,
        quizAnswers: stats.quizAnswers,
        remaining: {
          xp: DAILY_LIMITS.MAX_XP_PER_DAY - stats.xpEarned,
          adViews: DAILY_LIMITS.MAX_AD_VIEWS_PER_DAY - stats.adViews,
          quizzes: DAILY_LIMITS.MAX_QUIZ_PER_DAY - stats.quizAnswers,
        },
        limits: stats.limits,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to get daily stats' },
      { status: 500 }
    );
  }
}
