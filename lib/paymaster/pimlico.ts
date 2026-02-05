/**
 * Pimlico Paymaster Integration for Gasless Transactions
 *
 * This module provides ERC-4337 Account Abstraction support using:
 * - Pimlico Bundler for UserOperation submission
 * - Pimlico Verifying Paymaster for gas sponsorship
 */

import { createPublicClient, http, type Address, type Hex, encodeFunctionData } from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';

// Environment configuration
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
const NETWORK = process.env.NEXT_PUBLIC_WORLD_CHAIN_NETWORK || 'sepolia';

// Chain configuration
export const targetChain = NETWORK === 'mainnet' ? worldchain : worldchainSepolia;
const CHAIN_ID = targetChain.id;
const BUNDLER_URL = `https://api.pimlico.io/v2/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`;

// WLD Claim Contract ABI
const WLD_CLAIM_ABI = [
  {
    inputs: [
      { name: 'totalEarned', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Create public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: targetChain,
  transport: http(),
});

// Create Pimlico bundler client
export function createPimlicoBundlerClient() {
  if (!PIMLICO_API_KEY) {
    throw new Error('PIMLICO_API_KEY is not configured');
  }

  return createPimlicoClient({
    transport: http(BUNDLER_URL),
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
  });
}

/**
 * Check if Pimlico paymaster is available
 */
export function isPimlicoAvailable(): boolean {
  return !!PIMLICO_API_KEY;
}

/**
 * Encode claim transaction calldata
 */
export function encodeClaimCalldata(
  totalEarnedWei: string,
  expiry: number,
  signature: Hex
): Hex {
  return encodeFunctionData({
    abi: WLD_CLAIM_ABI,
    functionName: 'claim',
    args: [BigInt(totalEarnedWei), BigInt(expiry), signature],
  });
}

/**
 * Get gas prices from Pimlico
 */
export async function getGasPrices() {
  const bundlerClient = createPimlicoBundlerClient();
  return bundlerClient.getUserOperationGasPrice();
}

/**
 * Sponsorship policy types for Pimlico
 */
export interface SponsorshipPolicy {
  sponsorshipPolicyId?: string;
}

/**
 * UserOperation result
 */
export interface UserOpResult {
  userOpHash: Hex;
  success: boolean;
  transactionHash?: Hex;
  error?: string;
}

/**
 * Get the WorldScan URL for a transaction
 */
export function getWorldScanUrl(txHash: string): string {
  const baseUrl = NETWORK === 'mainnet'
    ? 'https://worldscan.org'
    : 'https://sepolia.worldscan.org';
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Export chain info for external use
 */
export const chainInfo = {
  chainId: CHAIN_ID,
  network: NETWORK,
  bundlerUrl: BUNDLER_URL,
  entryPoint: entryPoint07Address,
};
