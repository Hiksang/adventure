import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { nullifier_hash, verification_level, wallet_address, username } = await req.json();

    // DEV mode bypass
    if (IS_DEV && !supabaseAdmin) {
      return NextResponse.json({
        success: true,
        user: {
          id: 'dev-user-001',
          nullifier_hash: nullifier_hash || 'dev-nullifier',
          wallet_address: wallet_address || '0x0000000000000000000000000000000000000000',
          username: username || 'DevUser',
          verification_level: verification_level || 'device',
          world_id_verified: true,
          xp: 0,
          level: 1,
        },
      });
    }

    // Require nullifier_hash for signup (World ID must be verified first)
    if (!nullifier_hash) {
      return NextResponse.json(
        { error: 'WORLD_ID_REQUIRED', message: 'World ID verification is required to sign up' },
        { status: 400 }
      );
    }

    // Require wallet_address for WLD rewards
    if (!wallet_address) {
      return NextResponse.json(
        { error: 'WALLET_REQUIRED', message: 'Wallet address is required for WLD rewards' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { error: 'INVALID_WALLET', message: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check if nullifier already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, nullifier_hash')
      .eq('nullifier_hash', nullifier_hash)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'ALREADY_REGISTERED', message: 'This World ID has already been registered' },
        { status: 409 }
      );
    }

    // Verify that nullifier exists in world_id_proofs (user actually verified)
    const { data: proofExists } = await supabaseAdmin
      .from('world_id_proofs')
      .select('id, verification_level')
      .eq('nullifier_hash', nullifier_hash)
      .single();

    if (!proofExists) {
      return NextResponse.json(
        { error: 'VERIFICATION_NOT_FOUND', message: 'Please verify with World ID first' },
        { status: 400 }
      );
    }

    // Create user with nullifier_hash
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        nullifier_hash,
        wallet_address: wallet_address || null,
        username: username || 'User',
        verification_level: proofExists.verification_level || verification_level || 'device',
        world_id_verified: true,
        world_id_verified_at: new Date().toISOString(),
        xp: 0,
        level: 1,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Signup] Failed to create user:', createError);
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'ALREADY_REGISTERED', message: 'This account already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Link the proof to the user
    await supabaseAdmin
      .from('world_id_proofs')
      .update({ user_id: newUser.id })
      .eq('nullifier_hash', nullifier_hash);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        nullifier_hash: newUser.nullifier_hash,
        wallet_address: newUser.wallet_address,
        username: newUser.username,
        verification_level: newUser.verification_level,
        world_id_verified: newUser.world_id_verified,
        xp: newUser.xp,
        level: newUser.level,
      },
    });
  } catch (error) {
    console.error('[Signup] Error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}

// GET: Check if nullifier is already registered
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nullifier_hash = searchParams.get('nullifier_hash');

  if (!nullifier_hash) {
    return NextResponse.json({ error: 'nullifier_hash required' }, { status: 400 });
  }

  if (IS_DEV && !supabaseAdmin) {
    return NextResponse.json({ exists: false });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('nullifier_hash', nullifier_hash)
    .single();

  return NextResponse.json({ exists: !!data });
}
