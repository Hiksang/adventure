import { NextRequest, NextResponse } from 'next/server';
import { redeemForGiftcard } from '@/lib/credits/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/credits/redeem/giftcard
 * Redeem credits for a gift card
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nullifier_hash, product_id } = body;

    if (!nullifier_hash) {
      return NextResponse.json({ error: 'Missing nullifier_hash' }, { status: 400 });
    }

    if (!product_id) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
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

    const result = await redeemForGiftcard({
      nullifierHash: nullifier_hash,
      userId: user.id,
      productId: product_id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      redemption_id: result.redemptionId,
      product: result.product,
      status: 'pending',
    });
  } catch (error) {
    console.error('Redeem giftcard error:', error);
    return NextResponse.json({ error: 'Failed to redeem for gift card' }, { status: 500 });
  }
}
