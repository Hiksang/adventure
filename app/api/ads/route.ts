import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import type { Ad } from '@/types';

const MOCK_ADS: Ad[] = [
  {
    id: '1',
    title: 'World App Launch',
    description: 'Discover the future of identity verification with World App.',
    type: 'text',
    content_url: null,
    content_text: 'World App is revolutionizing digital identity. With World ID, you can prove you are a unique human without revealing personal information. Join millions of verified humans building a more equitable digital economy. World App provides a secure wallet, seamless payments, and access to a growing ecosystem of decentralized applications.',
    thumbnail_url: null,
    xp_reward: 50,
    wld_reward: 0.1,
    duration_seconds: 15,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'DeFi Explained',
    description: 'Learn about decentralized finance in 30 seconds.',
    type: 'video',
    content_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    content_text: null,
    thumbnail_url: null,
    xp_reward: 100,
    wld_reward: 0.2,
    duration_seconds: 30,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Crypto Security Tips',
    description: 'Essential tips to keep your crypto assets safe.',
    type: 'text',
    content_url: null,
    content_text: 'Protect your crypto: 1) Never share your seed phrase. 2) Use hardware wallets for large holdings. 3) Enable 2FA on all exchange accounts. 4) Verify URLs before connecting wallets. 5) Use unique passwords for each service. 6) Keep software updated. 7) Be wary of unsolicited messages. Stay safe in the decentralized world!',
    thumbnail_url: null,
    xp_reward: 50,
    wld_reward: 0.1,
    duration_seconds: 20,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export async function GET() {
  if (IS_DEV) {
    return NextResponse.json(MOCK_ADS);
  }

  const { data, error } = await supabaseAdmin
    .from('ads')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
