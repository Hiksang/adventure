/**
 * Sponsored WLD Claim API
 *
 * This endpoint handles gasless WLD claims using a relayer.
 * The relayer pays gas fees on behalf of the user.
 *
 * When Pimlico is configured, it uses ERC-4337 paymaster for gas sponsorship.
 * Otherwise, it falls back to relayer-paid transactions.
 *
 * POST /api/credits/claim-sponsored
 * Body: { nullifier_hash, wallet_address, total_earned_wei, expiry, signature }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  encodeFunctionData,
} from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Environment
const RELAYER_PRIVATE_KEY = process.env.WLD_RELAYER_PRIVATE_KEY;
const NETWORK = process.env.NEXT_PUBLIC_WORLD_CHAIN_NETWORK || 'sepolia';

// Chain config
const targetChain = NETWORK === 'mainnet' ? worldchain : worldchainSepolia;

// Contract addresses
const WLD_CLAIM_CONTRACT = process.env.NEXT_PUBLIC_WLD_CLAIM_CONTRACT as Address;

// WLD Claim Contract V2 ABI (with claimFor for relayer support)
const WLD_CLAIM_ABI = [
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'totalEarned', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'claimFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface SponsoredClaimRequest {
  nullifier_hash: string;
  wallet_address: string;
  total_earned_wei: string;
  expiry: number;
  signature: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    if (!RELAYER_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Relayer not configured' },
        { status: 503 }
      );
    }

    const body: SponsoredClaimRequest = await request.json();
    const {
      nullifier_hash,
      wallet_address,
      total_earned_wei,
      expiry,
      signature,
    } = body;

    // Validate inputs
    if (!nullifier_hash || !wallet_address || !total_earned_wei || !expiry || !signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[claim-sponsored] Processing sponsored claim:', {
      wallet: wallet_address,
      totalEarnedWei: total_earned_wei,
      expiry: new Date(expiry * 1000).toISOString(),
    });

    // Create relayer account
    const relayerAccount = privateKeyToAccount(RELAYER_PRIVATE_KEY as `0x${string}`);
    console.log('[claim-sponsored] Relayer address:', relayerAccount.address);

    // Build claimFor calldata (relayer calls on behalf of user)
    const calldata = encodeFunctionData({
      abi: WLD_CLAIM_ABI,
      functionName: 'claimFor',
      args: [wallet_address as Address, BigInt(total_earned_wei), BigInt(expiry), signature as Hex],
    });

    // Create wallet client with relayer
    const walletClient = createWalletClient({
      account: relayerAccount,
      chain: targetChain,
      transport: http(),
    });

    // Send the transaction (relayer pays gas)
    const txHash = await walletClient.sendTransaction({
      to: WLD_CLAIM_CONTRACT,
      data: calldata,
      value: BigInt(0),
    });

    console.log('[claim-sponsored] Transaction submitted:', txHash);

    // Return immediately with txHash
    return NextResponse.json({
      success: true,
      userOpHash: txHash,
      message: 'Transaction submitted via relayer',
    });

  } catch (error) {
    console.error('[claim-sponsored] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Sponsored claim failed';

    // Check for specific errors
    if (errorMessage.includes('insufficient funds')) {
      return NextResponse.json(
        { success: false, error: 'Relayer out of funds. Please try again later.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { success: false, error: 'Rate limited. Please wait and try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
