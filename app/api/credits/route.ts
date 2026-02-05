import { NextRequest, NextResponse } from 'next/server';
import { getUserCreditBalance, getCreditConfig } from '@/lib/credits/service';

/**
 * GET /api/credits?nullifier={nullifier_hash}
 * Get user's credit balance and configuration
 */
export async function GET(request: NextRequest) {
  const nullifier = request.nextUrl.searchParams.get('nullifier');

  if (!nullifier) {
    return NextResponse.json({ error: 'Missing nullifier' }, { status: 400 });
  }

  try {
    const [balance, config] = await Promise.all([
      getUserCreditBalance(nullifier),
      getCreditConfig(),
    ]);

    return NextResponse.json({
      balance,
      config: {
        credits_per_ad_view: config.credits_per_ad_view,
        wld_redemption_rate: config.wld_redemption_rate,
        min_wld_redemption_credits: config.min_wld_redemption_credits,
      },
    });
  } catch (error) {
    console.error('Get credits error:', error);
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 });
  }
}
