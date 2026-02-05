import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateClaimSignature, getUserNonce, ACTIVE_CONFIG } from '@/lib/wld/signer';
import { syncUserClaimStatus } from '@/lib/wld/sync';
import { checkCombinedRateLimit, getClientIP } from '@/lib/security/rateLimit';
import {
  parseJsonBody,
  validateClaimSignatureRequest,
  validationError,
} from '@/lib/security/validation';

/**
 * POST /api/credits/claim-signature
 * Generate a signature for claiming WLD tokens on-chain
 *
 * SECURITY:
 * - Rate limiting: 5 requests per minute per user, 10 per IP
 * - Input validation: nullifier_hash and wallet_address format
 * - Signature includes chainId, contract address, and nonce for replay protection
 * - Nonce is fetched from the contract to ensure consistency
 * - DB state is synced with on-chain before generating signature
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const { data: body, error: parseError } = await parseJsonBody<{
      nullifier_hash: string;
      wallet_address: string;
    }>(request);

    if (parseError || !body) {
      return NextResponse.json({ error: parseError || 'Invalid request' }, { status: 400 });
    }

    // Validate input formats
    const validation = validateClaimSignatureRequest(body);
    if (!validation.valid) {
      return NextResponse.json(validationError(validation.errors), { status: 400 });
    }

    const { nullifier_hash, wallet_address } = validation.data!;

    // Rate limiting (CRITICAL for signature endpoint)
    const ip = getClientIP(request);
    const rateLimitResponse = checkCombinedRateLimit(nullifier_hash, ip, 'claimSignature');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createServerSupabaseClient();

    // Get user and their claimable WLD
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, wld_claimable, wld_claimed, wallet_address, verification_level')
      .eq('nullifier_hash', nullifier_hash)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // World ID 인증 필수 (nullifier_hash로 조회했으므로 기본적으로 인증됨)
    // 추가로 Orb 인증 필수로 하려면 아래 주석 해제
    // if (user.verification_level !== 'orb') {
    //   return NextResponse.json(
    //     { error: 'Orb verification required to claim WLD' },
    //     { status: 403 }
    //   );
    // }

    // 온체인 상태와 DB 동기화 (서명 발급 전에 최신 상태 확인)
    // SECURITY: Sync failure should block signature generation to prevent stale data claims
    try {
      await syncUserClaimStatus(nullifier_hash);
    } catch (syncError) {
      console.error('[ClaimSignature] Sync failed:', syncError);
      return NextResponse.json(
        { error: 'Failed to sync blockchain state. Please try again.' },
        { status: 503 }
      );
    }

    // 동기화 후 다시 조회
    const { data: syncedUser } = await supabase
      .from('users')
      .select('wld_claimable, wld_claimed')
      .eq('nullifier_hash', nullifier_hash)
      .single();

    const wldClaimable = Number(syncedUser?.wld_claimable || user.wld_claimable) || 0;

    // Check minimum claim amount (0.01 WLD as per contract)
    const MIN_CLAIM_AMOUNT = 0.01;
    if (wldClaimable < MIN_CLAIM_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum claim amount is ${MIN_CLAIM_AMOUNT} WLD. Current claimable: ${wldClaimable}` },
        { status: 400 }
      );
    }

    // Update user's wallet address if different
    if (user.wallet_address !== wallet_address) {
      await supabase
        .from('users')
        .update({ wallet_address })
        .eq('nullifier_hash', nullifier_hash);
    }

    // Get user's current nonce from the contract
    let userNonce: number;
    try {
      userNonce = await getUserNonce(wallet_address);
    } catch (nonceError) {
      console.error('Failed to get nonce:', nonceError);
      return NextResponse.json(
        { error: 'Failed to get user nonce from contract' },
        { status: 500 }
      );
    }

    // Generate signature
    // totalEarned = already claimed + claimable (cumulative total)
    const wldClaimed = Number(syncedUser?.wld_claimed || user.wld_claimed) || 0;
    const totalEarned = wldClaimed + wldClaimable;

    const signatureData = await generateClaimSignature(
      wallet_address,
      totalEarned,
      userNonce
    );

    // Log signature for auditing
    await supabase.from('wld_claim_signatures').insert({
      user_id: user.id,
      nullifier_hash,
      wallet_address,
      total_claimable: wldClaimable,
      nonce: userNonce,
      signature: signatureData.signature,
      expires_at: signatureData.expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      claimable_wld: wldClaimable,
      total_earned_wld: totalEarned,
      total_earned_wei: signatureData.totalEarnedWei,
      nonce: signatureData.nonce,
      expiry: signatureData.expiry,
      expires_at: signatureData.expiresAt.toISOString(),
      signature: signatureData.signature,
      contract: {
        address: signatureData.contractAddress,
        chain_id: signatureData.chainId,
      },
    });
  } catch (error) {
    console.error('Claim signature error:', error);
    return NextResponse.json(
      { error: 'Failed to generate claim signature' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/credits/claim-signature
 * Get claim info without generating signature
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nullifierHash = searchParams.get('nullifier');
    const walletAddress = searchParams.get('wallet');

    if (!nullifierHash) {
      return NextResponse.json(
        { error: 'Missing nullifier parameter' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('wld_claimable, wld_claimed, wallet_address')
      .eq('nullifier_hash', nullifierHash)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get nonce if wallet address provided
    let userNonce = 0;
    const effectiveWallet = walletAddress || user.wallet_address;
    if (effectiveWallet) {
      try {
        userNonce = await getUserNonce(effectiveWallet);
      } catch (e) {
        // Ignore nonce fetch errors for GET
      }
    }

    return NextResponse.json({
      claimable_wld: Number(user.wld_claimable) || 0,
      claimed_wld: Number(user.wld_claimed) || 0,
      wallet_address: user.wallet_address,
      nonce: userNonce,
      min_claim_amount: 0.01,
      contract: {
        address: ACTIVE_CONFIG.claimContract,
        chain_id: ACTIVE_CONFIG.chainId,
      },
    });
  } catch (error) {
    console.error('Get claim info error:', error);
    return NextResponse.json(
      { error: 'Failed to get claim info' },
      { status: 500 }
    );
  }
}
