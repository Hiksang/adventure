import { NextRequest, NextResponse } from 'next/server';
import { recordWLDClaim } from '@/lib/credits/service';

/**
 * POST /api/credits/claim-complete
 * Record a successful on-chain WLD claim
 * Called by frontend after successful transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nullifier_hash, wallet_address, amount_claimed, tx_hash, block_number } = body;

    if (!nullifier_hash) {
      return NextResponse.json(
        { error: 'Missing nullifier_hash' },
        { status: 400 }
      );
    }

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Missing wallet_address' },
        { status: 400 }
      );
    }

    if (!amount_claimed || amount_claimed <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount_claimed' },
        { status: 400 }
      );
    }

    if (!tx_hash) {
      return NextResponse.json(
        { error: 'Missing tx_hash' },
        { status: 400 }
      );
    }

    const result = await recordWLDClaim({
      nullifierHash: nullifier_hash,
      walletAddress: wallet_address,
      amountClaimed: amount_claimed,
      txHash: tx_hash,
      blockNumber: block_number,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Claim complete error:', error);
    return NextResponse.json(
      { error: 'Failed to record claim' },
      { status: 500 }
    );
  }
}
