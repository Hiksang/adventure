import { NextRequest, NextResponse } from 'next/server';
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js';
import { IS_DEV } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload, nonce } = body;

    // DEV mode bypass
    if (IS_DEV) {
      return NextResponse.json({
        success: true,
        walletAddress: '0x0000000000000000000000000000000000000000',
        isValid: true,
      });
    }

    if (!payload || !nonce) {
      return NextResponse.json(
        { error: 'Missing payload or nonce' },
        { status: 400 }
      );
    }

    // Verify the SIWE message
    const validMessage = await verifySiweMessage(
      payload as MiniAppWalletAuthSuccessPayload,
      nonce
    );

    if (!validMessage.isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      walletAddress: validMessage.siweMessageData?.address,
      isValid: true,
    });
  } catch (error) {
    console.error('[WalletAuth] Verify error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
