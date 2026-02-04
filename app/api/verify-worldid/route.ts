import { NextRequest, NextResponse } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';

interface WorldIDPayload {
  nullifier_hash: string;
  merkle_root: string;
  verification_level: string;
}

export async function POST(req: NextRequest) {
  try {
    const { payload, action } = await req.json();

    const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;

    // DEV mode bypass
    if (IS_DEV && !supabaseAdmin) {
      return NextResponse.json({
        success: true,
        nullifier_hash: 'dev-nullifier-' + Date.now(),
        verification_level: 'device',
      });
    }

    const verifyResponse = (await verifyCloudProof(
      payload as ISuccessResult,
      app_id,
      action
    )) as IVerifyResponse;

    if (!verifyResponse.success) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Extract additional fields from payload
    const nullifier_hash = (payload as WorldIDPayload).nullifier_hash;
    const merkle_root = (payload as WorldIDPayload).merkle_root;
    const verification_level = (payload as WorldIDPayload).verification_level;

    if (!nullifier_hash) {
      return NextResponse.json({ error: 'Missing nullifier_hash' }, { status: 400 });
    }

    // Check for duplicate registration (same nullifier + action)
    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('world_id_proofs')
        .select('id')
        .eq('nullifier_hash', nullifier_hash)
        .eq('action', action)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'ALREADY_REGISTERED', message: 'This World ID has already been used' },
          { status: 409 }
        );
      }

      // Store the proof
      const { error: insertError } = await supabaseAdmin
        .from('world_id_proofs')
        .insert({
          nullifier_hash,
          verification_level: verification_level || 'device',
          merkle_root: merkle_root || '',
          action,
        });

      if (insertError) {
        console.error('[WorldID] Failed to store proof:', insertError);
        // If it's a unique constraint violation, return already registered
        if (insertError.code === '23505') {
          return NextResponse.json(
            { error: 'ALREADY_REGISTERED', message: 'This World ID has already been used' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: 'Failed to store verification' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      nullifier_hash,
      verification_level: verification_level || 'device',
    });
  } catch (error) {
    console.error('[WorldID] Verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
