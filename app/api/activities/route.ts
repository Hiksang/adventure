import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import type { Activity } from '@/types';

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: 'Promo Code Entry',
    description: 'Enter the promo code from the World App event.',
    type: 'code_entry',
    code: 'WORLD2025',
    questions: null,
    xp_reward: 100,
    wld_reward: 0.5,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Blockchain Basics Quiz',
    description: 'Test your knowledge about blockchain technology.',
    type: 'knowledge_quiz',
    code: null,
    questions: [
      { id: 'q1', question: 'What is a blockchain?', options: ['A type of database', 'A programming language', 'An operating system', 'A web browser'], correct_index: 0 },
      { id: 'q2', question: 'What consensus mechanism does Ethereum use?', options: ['Proof of Work', 'Proof of Stake', 'Proof of Authority', 'Proof of Space'], correct_index: 1 },
      { id: 'q3', question: 'What is a smart contract?', options: ['A legal document', 'Self-executing code on blockchain', 'A type of wallet', 'An exchange'], correct_index: 1 },
    ],
    xp_reward: 150,
    wld_reward: 0.3,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export async function GET() {
  if (IS_DEV) {
    return NextResponse.json(MOCK_ACTIVITIES);
  }

  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
