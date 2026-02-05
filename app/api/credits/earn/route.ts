import { NextRequest, NextResponse } from 'next/server';
import { earnCredits } from '@/lib/credits/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/credits/earn
 * Earn credits from watching ads, quizzes, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nullifier_hash, type, reference_id, amount } = body;

    if (!nullifier_hash) {
      return NextResponse.json({ error: 'Missing nullifier_hash' }, { status: 400 });
    }

    if (!type || !['ad_view', 'quiz', 'bonus', 'referral'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
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

    const result = await earnCredits({
      nullifierHash: nullifier_hash,
      userId: user.id,
      type,
      referenceId: reference_id,
      amount,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      credits_earned: result.creditsEarned,
      new_balance: result.newBalance,
      transaction_id: result.transactionId,
    });
  } catch (error) {
    console.error('Earn credits error:', error);
    return NextResponse.json({ error: 'Failed to earn credits' }, { status: 500 });
  }
}
