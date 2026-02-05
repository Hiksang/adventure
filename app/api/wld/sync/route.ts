import { NextRequest, NextResponse } from 'next/server';
import { syncUserClaimStatus, syncAllUsers, getOnChainClaimStatus } from '@/lib/wld/sync';

/**
 * POST /api/wld/sync
 * 특정 유저의 온체인 클레임 상태를 DB와 동기화
 */
export async function POST(request: NextRequest) {
  try {
    const { nullifier_hash } = await request.json();

    if (!nullifier_hash) {
      return NextResponse.json(
        { error: 'Missing nullifier_hash' },
        { status: 400 }
      );
    }

    const result = await syncUserClaimStatus(nullifier_hash);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wld/sync?wallet=0x...
 * 온체인 클레임 상태 조회 (동기화 없이)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing wallet parameter' },
        { status: 400 }
      );
    }

    const status = await getOnChainClaimStatus(wallet);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
