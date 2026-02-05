import { NextRequest, NextResponse } from 'next/server';
import { redeemForWLD, getCreditConfig } from '@/lib/credits/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/credits/redeem/wld
 * Convert credits to claimable WLD
 * User can then claim WLD on-chain via /api/credits/claim-signature
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nullifier_hash, credits, wallet_address } = body;

    if (!nullifier_hash) {
      return NextResponse.json({ error: 'Missing nullifier_hash' }, { status: 400 });
    }

    if (!credits || credits <= 0) {
      return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
    }

    // Validate wallet address format if provided
    if (wallet_address && !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Get user ID from nullifier
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('nullifier_hash', nullifier_hash)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await redeemForWLD({
      nullifierHash: nullifier_hash,
      userId: user.id,
      credits,
      walletAddress: wallet_address,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      wld_amount: result.wldAmount,
      new_claimable: result.newClaimable,
      message: 'Credits converted to WLD. Use /api/credits/claim-signature to claim on-chain.',
    });
  } catch (error) {
    console.error('Redeem WLD error:', error);
    return NextResponse.json({ error: 'Failed to redeem for WLD' }, { status: 500 });
  }
}

/**
 * GET /api/credits/redeem/wld
 * Get WLD redemption info (rate, minimum, etc.)
 */
export async function GET() {
  try {
    const config = await getCreditConfig();

    return NextResponse.json({
      credits_per_wld: config.wld_redemption_rate,
      min_credits: config.min_wld_redemption_credits,
      min_wld: config.min_wld_redemption_wld,
    });
  } catch (error) {
    console.error('Get WLD redemption info error:', error);
    return NextResponse.json({ error: 'Failed to get redemption info' }, { status: 500 });
  }
}
