import { NextRequest, NextResponse } from 'next/server';
import { IS_DEV } from '@/lib/env';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { rewardId } = await req.json();
  const referenceId = crypto.randomUUID();

  if (IS_DEV) {
    return NextResponse.json({ id: referenceId, success: true });
  }

  // PROD: create payment reference, update reward status
  return NextResponse.json({ id: referenceId });
}
