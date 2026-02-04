import { NextResponse } from 'next/server';
import { completeAdView, getStats } from '@/lib/adViewStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, adId, viewToken, expectedXP } = body;

    if (!userId || !adId || !viewToken || typeof expectedXP !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, adId, viewToken, expectedXP' },
        { status: 400 }
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

    // In production: Save XP to database here
    console.log('[AdView] XP awarded:', {
      userId,
      adId,
      xp: result.xpAwarded,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      xpAwarded: result.xpAwarded,
      message: 'Ad view completed',
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
