import { NextRequest, NextResponse } from 'next/server';
import { IS_DEV } from '@/lib/env';

// In-memory nonce store (use Redis/DB in production)
// Shared with verify route via module
export const nonceStore = new Map<string, { nonce: string; expires: number }>();

function cleanupNonces() {
  const now = Date.now();
  for (const [key, value] of nonceStore.entries()) {
    if (value.expires < now) {
      nonceStore.delete(key);
    }
  }
}

export async function POST(req: NextRequest) {
  // DEV mode bypass
  if (IS_DEV) {
    return NextResponse.json({
      nonce: `dev-nonce-${Date.now()}`,
      clientId: 'dev-client',
    });
  }

  cleanupNonces();

  const nonce = crypto.randomUUID();
  const clientId = req.headers.get('x-client-id') || crypto.randomUUID();

  nonceStore.set(clientId, {
    nonce,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  return NextResponse.json({
    nonce,
    clientId,
  });
}
