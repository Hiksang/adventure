/**
 * WLD Claim Signature Generator
 * Generates EIP-191 signatures for on-chain claim verification
 *
 * SECURITY: This module handles sensitive private key operations
 * - Never log or expose private keys
 * - Signatures include chainId, contract address, and nonce for replay protection
 */

// WLD Claim Contract Configuration
export const WLD_CLAIM_CONFIG = {
  // World Chain Mainnet
  mainnet: {
    chainId: 480,
    wldToken: process.env.NEXT_PUBLIC_WLD_TOKEN_ADDRESS || '',
    claimContract: process.env.NEXT_PUBLIC_WLD_CLAIM_CONTRACT || '',
    rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
    explorerUrl: 'https://worldscan.org',
  },
  // World Chain Sepolia (Testnet)
  sepolia: {
    chainId: 4801,
    wldToken: process.env.NEXT_PUBLIC_WLD_TOKEN_ADDRESS || '',
    claimContract: process.env.NEXT_PUBLIC_WLD_CLAIM_CONTRACT || '',
    rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
    explorerUrl: 'https://sepolia.worldscan.org',
  },
};

const NETWORK = process.env.NEXT_PUBLIC_WORLD_CHAIN_NETWORK || 'sepolia';
export const ACTIVE_CONFIG = WLD_CLAIM_CONFIG[NETWORK as keyof typeof WLD_CLAIM_CONFIG];

// Signature expiry time (15 minutes - reduced for security)
// Shorter validity window reduces risk of stale signature usage
const SIGNATURE_EXPIRY_SECONDS = 15 * 60;

/**
 * Convert WLD amount to wei (18 decimals)
 */
export function toWei(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e18));
}

/**
 * Convert wei to WLD amount
 */
export function fromWei(wei: bigint): number {
  return Number(wei) / 1e18;
}

/**
 * Generate claim signature using ethers.js
 *
 * IMPORTANT: The signature message includes:
 * - chainId: Prevents cross-chain replay attacks
 * - contractAddress: Prevents cross-contract replay attacks
 * - userAddress: Binds signature to specific user
 * - totalEarned: Cumulative earned amount (wei)
 * - nonce: Prevents signature reuse for same parameters
 * - expiry: Time-bounds the signature validity
 *
 * @param userAddress - The user's wallet address
 * @param totalClaimableWLD - Total claimable WLD amount (not wei)
 * @param nonce - User's current nonce from contract
 */
export async function generateClaimSignature(
  userAddress: string,
  totalClaimableWLD: number,
  nonce: number
): Promise<{
  signature: string;
  totalEarnedWei: string;
  nonce: number;
  expiry: number;
  expiresAt: Date;
  chainId: number;
  contractAddress: string;
}> {
  const privateKey = process.env.WLD_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('WLD_SIGNER_PRIVATE_KEY not configured');
  }

  if (!ACTIVE_CONFIG.claimContract) {
    throw new Error('WLD_CLAIM_CONTRACT not configured');
  }

  // Validate user address
  if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    throw new Error('Invalid user address format');
  }

  // Dynamic import to avoid issues in edge runtime
  const { ethers } = await import('ethers');

  const wallet = new ethers.Wallet(privateKey);
  const totalEarnedWei = toWei(totalClaimableWLD);
  const expiry = Math.floor(Date.now() / 1000) + SIGNATURE_EXPIRY_SECONDS;
  const chainId = ACTIVE_CONFIG.chainId;
  const contractAddress = ACTIVE_CONFIG.claimContract;

  // Create message hash matching contract's verification
  // keccak256(abi.encodePacked(chainId, contractAddress, userAddress, totalEarned, nonce, expiry))
  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
    [chainId, contractAddress, userAddress, totalEarnedWei, nonce, expiry]
  );

  // Sign the message (this adds the Ethereum signed message prefix)
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return {
    signature,
    totalEarnedWei: totalEarnedWei.toString(),
    nonce,
    expiry,
    expiresAt: new Date(expiry * 1000),
    chainId,
    contractAddress,
  };
}

/**
 * Get the signer address from private key
 */
export async function getSignerAddress(): Promise<string> {
  const privateKey = process.env.WLD_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('WLD_SIGNER_PRIVATE_KEY not configured');
  }

  const { ethers } = await import('ethers');
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Verify a signature (for testing/debugging)
 */
export async function verifyClaimSignature(
  userAddress: string,
  totalEarnedWei: bigint,
  nonce: number,
  expiry: number,
  signature: string
): Promise<{ valid: boolean; signer: string; expectedSigner: string }> {
  const { ethers } = await import('ethers');

  const chainId = ACTIVE_CONFIG.chainId;
  const contractAddress = ACTIVE_CONFIG.claimContract;

  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
    [chainId, contractAddress, userAddress, totalEarnedWei, nonce, expiry]
  );

  const recoveredAddress = ethers.verifyMessage(
    ethers.getBytes(messageHash),
    signature
  );

  const expectedSigner = await getSignerAddress();

  return {
    valid: recoveredAddress.toLowerCase() === expectedSigner.toLowerCase(),
    signer: recoveredAddress,
    expectedSigner,
  };
}

/**
 * Get user's current nonce from the contract
 */
export async function getUserNonce(userAddress: string): Promise<number> {
  const { ethers } = await import('ethers');

  const provider = new ethers.JsonRpcProvider(ACTIVE_CONFIG.rpcUrl);
  const contract = new ethers.Contract(
    ACTIVE_CONFIG.claimContract,
    ['function nonces(address) view returns (uint256)'],
    provider
  );

  const nonce = await contract.nonces(userAddress);
  return Number(nonce);
}

/**
 * Get claim info from the contract
 */
export async function getContractClaimInfo(userAddress: string, totalEarned: bigint): Promise<{
  claimable: bigint;
  nextClaimTime: number;
  canClaimNow: boolean;
  userNonce: number;
}> {
  const { ethers } = await import('ethers');

  const provider = new ethers.JsonRpcProvider(ACTIVE_CONFIG.rpcUrl);
  const contract = new ethers.Contract(
    ACTIVE_CONFIG.claimContract,
    ['function getClaimInfo(address, uint256) view returns (uint256, uint256, bool, uint256)'],
    provider
  );

  const [claimable, nextClaimTime, canClaimNow, userNonce] = await contract.getClaimInfo(userAddress, totalEarned);

  return {
    claimable,
    nextClaimTime: Number(nextClaimTime),
    canClaimNow,
    userNonce: Number(userNonce),
  };
}
