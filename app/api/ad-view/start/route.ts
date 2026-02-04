import { NextResponse } from 'next/server';
import { startAdView } from '@/lib/adViewStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, adId, duration } = body;

    if (!userId || !adId || typeof duration !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, adId, duration' },
        { status: 400 }
      );
    }

    if (duration < 1 || duration > 300) {
      return NextResponse.json(
        { success: false, error: 'Invalid duration (must be 1-300 seconds)' },
        { status: 400 }
      );
    }

    const viewToken = startAdView(userId, adId, duration);

    return NextResponse.json({
      success: true,
      viewToken,
      message: 'Ad view started',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to start ad view' },
      { status: 500 }
    );
  }
}
