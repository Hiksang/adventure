import { NextRequest, NextResponse } from 'next/server';
import { getTransactionHistory } from '@/lib/credits/service';

/**
 * GET /api/credits/history?nullifier={nullifier_hash}&limit={limit}&cursor={cursor}
 * Get credit transaction history
 */
export async function GET(request: NextRequest) {
  const nullifier = request.nextUrl.searchParams.get('nullifier');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const cursor = request.nextUrl.searchParams.get('cursor');

  if (!nullifier) {
    return NextResponse.json({ error: 'Missing nullifier' }, { status: 400 });
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: 'Invalid limit (1-100)' }, { status: 400 });
  }

  try {
    const result = await getTransactionHistory(
      nullifier,
      limit,
      cursor || undefined
    );

    return NextResponse.json({
      transactions: result.transactions,
      has_more: result.hasMore,
      next_cursor: result.nextCursor,
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    return NextResponse.json({ error: 'Failed to get transaction history' }, { status: 500 });
  }
}
