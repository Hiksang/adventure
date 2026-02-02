import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const cookieStore = await cookies();
  cookieStore.set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
  });
  return NextResponse.json({ nonce });
}
