import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js';

export async function POST(req: NextRequest) {
  try {
    const { payload, nonce } = (await req.json()) as {
      payload: MiniAppWalletAuthSuccessPayload;
      nonce: string;
    };

    const cookieStore = await cookies();
    const storedNonce = cookieStore.get('siwe-nonce')?.value;

    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
    }

    const validMessage = await verifySiweMessage(payload, nonce);
    if (!validMessage.isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    return NextResponse.json({ success: true, address: payload.address });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
