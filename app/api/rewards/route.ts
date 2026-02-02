import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import type { Reward, RewardSummary } from '@/types';

const MOCK_REWARDS: Reward[] = [
  { id: '1', user_id: 'dev-user-001', type: 'xp', amount: 50, source: 'ad_view', source_id: '1', claimed: true, tx_hash: null, created_at: new Date().toISOString() },
  { id: '2', user_id: 'dev-user-001', type: 'xp', amount: 100, source: 'activity_completion', source_id: '1', claimed: true, tx_hash: null, created_at: new Date().toISOString() },
  { id: '3', user_id: 'dev-user-001', type: 'wld', amount: 0.5, source: 'activity_completion', source_id: '1', claimed: false, tx_hash: null, created_at: new Date().toISOString() },
];

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || 'dev-user-001';

  if (IS_DEV) {
    const summary: RewardSummary = {
      total_xp: 250,
      total_wld_earned: 0.8,
      total_wld_claimed: 0.3,
      pending_wld: 0.5,
      level: 3,
      ads_watched: 3,
      activities_completed: 2,
    };
    return NextResponse.json({ rewards: MOCK_REWARDS, summary });
  }

  const { data: rewards } = await supabaseAdmin!
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ rewards: rewards || [], summary: null });
}
