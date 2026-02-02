import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, watchPercentage } = await req.json();
  const completed = watchPercentage >= 90;

  if (IS_DEV) {
    return NextResponse.json({
      success: true,
      completed,
      xp_earned: completed ? 50 : 0,
    });
  }

  const { error } = await supabaseAdmin!.from('ad_views').insert({
    user_id: userId,
    ad_id: id,
    completed,
    watch_percentage: watchPercentage,
    xp_earned: completed ? 50 : 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (completed) {
    await supabaseAdmin!.rpc('add_xp', { p_user_id: userId, p_amount: 50, p_source: 'ad_view', p_source_id: id });
  }

  return NextResponse.json({ success: true, completed, xp_earned: completed ? 50 : 0 });
}
