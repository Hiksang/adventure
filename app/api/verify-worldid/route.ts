import { NextRequest, NextResponse } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';

export async function POST(req: NextRequest) {
  try {
    const { payload, action } = await req.json();

    const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;

    const verifyResponse = (await verifyCloudProof(
      payload as ISuccessResult,
      app_id,
      action
    )) as IVerifyResponse;

    if (verifyResponse.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
