/**
 * On-Chain WLD Claim Test Script
 *
 * Tests the complete on-chain claim flow:
 * 1. Setup test user with claimable WLD
 * 2. Generate claim signature
 * 3. Execute claim transaction on-chain
 * 4. Verify claim success
 *
 * Prerequisites:
 * - WLD_SIGNER_PRIVATE_KEY must be set in .env.local
 * - User must have a funded wallet on World Chain Sepolia
 *
 * Usage: npx tsx scripts/test-claim-onchain.ts [wallet_address]
 */

import { ethers } from 'ethers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Contract addresses (World Chain Sepolia)
const CONTRACTS = {
  WLD_TOKEN: '0xBe342539E1B83718680cc6BEf37c82df93c1b65C',
  CLAIM_CONTRACT: '0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB',
  RPC_URL: 'https://worldchain-sepolia.g.alchemy.com/public',
  CHAIN_ID: 4801,
};

// Claim contract ABI (minimal)
const CLAIM_ABI = [
  'function claim(uint256 totalEarned, uint256 expiry, bytes signature) external',
  'function nonces(address) view returns (uint256)',
  'function totalClaimed(address) view returns (uint256)',
  'function getClaimInfo(address, uint256) view returns (uint256, uint256, bool, uint256)',
  'event Claimed(address indexed user, uint256 amount)',
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

// Test nullifier
const TEST_NULLIFIER = '0x' + '1'.repeat(64);

async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return response.json();
}

async function main() {
  const walletAddress = process.argv[2];
  const privateKey = process.argv[3] || process.env.TEST_WALLET_PRIVATE_KEY;

  if (!walletAddress) {
    console.error('Usage: npx tsx scripts/test-claim-onchain.ts <wallet_address> [private_key]');
    console.error('\nExample:');
    console.error('  npx tsx scripts/test-claim-onchain.ts 0xef0Dc0662d2718c778d4c2676F3AbCE5E6177eDD');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  ON-CHAIN WLD CLAIM TEST');
  console.log('═'.repeat(60));
  console.log('Wallet:', walletAddress);
  console.log('Chain:', 'World Chain Sepolia (4801)');
  console.log('Claim Contract:', CONTRACTS.CLAIM_CONTRACT);
  console.log('');

  // Setup provider
  const provider = new ethers.JsonRpcProvider(CONTRACTS.RPC_URL);

  // Get wallet if private key provided
  let wallet: ethers.Wallet | null = null;
  if (privateKey) {
    wallet = new ethers.Wallet(privateKey, provider);
    console.log('Wallet loaded:', wallet.address);
  }

  // Contract instances
  const claimContract = new ethers.Contract(
    CONTRACTS.CLAIM_CONTRACT,
    CLAIM_ABI,
    wallet || provider
  );
  const wldToken = new ethers.Contract(
    CONTRACTS.WLD_TOKEN,
    ERC20_ABI,
    provider
  );

  try {
    // Step 1: Check initial balances
    console.log('\n' + '─'.repeat(60));
    console.log('Step 1: Check Initial State');
    console.log('─'.repeat(60));

    const [wldBalance, nonce, totalClaimed] = await Promise.all([
      wldToken.balanceOf(walletAddress),
      claimContract.nonces(walletAddress),
      claimContract.totalClaimed(walletAddress),
    ]);

    console.log('WLD Balance:', ethers.formatEther(wldBalance), 'WLD');
    console.log('Nonce:', nonce.toString());
    console.log('Total Claimed:', ethers.formatEther(totalClaimed), 'WLD');

    // Step 2: Setup test user in DB
    console.log('\n' + '─'.repeat(60));
    console.log('Step 2: Setup Test User');
    console.log('─'.repeat(60));

    // Update user in database with claimable WLD
    const setupResult = await fetch(`${BASE_URL}/api/auth/worldid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nullifier_hash: TEST_NULLIFIER,
        wallet_address: walletAddress,
      }),
    }).catch(() => null);

    console.log('User setup:', setupResult ? 'OK' : 'Skipped (user may exist)');

    // Step 3: Get claim signature from backend
    console.log('\n' + '─'.repeat(60));
    console.log('Step 3: Get Claim Signature');
    console.log('─'.repeat(60));

    const sigResponse = await fetchApi('/api/credits/claim-signature', {
      method: 'POST',
      body: JSON.stringify({
        nullifier_hash: TEST_NULLIFIER,
        wallet_address: walletAddress,
      }),
    });

    if (!sigResponse.success) {
      console.error('Failed to get signature:', sigResponse.error);

      // Check claim info
      const claimInfo = await fetchApi(
        `/api/credits/claim-signature?nullifier=${TEST_NULLIFIER}&wallet=${walletAddress}`
      );
      console.log('\nClaim Info:', claimInfo);

      if (claimInfo.claimable_wld < 0.01) {
        console.log('\n⚠ Not enough claimable WLD. Adding test credits...');

        // This would require direct DB access, so just show instructions
        console.log('\nTo add test WLD, run:');
        console.log(`docker exec supabase_db_migrations psql -U postgres -d postgres -c "UPDATE users SET wld_claimable = 1.0 WHERE nullifier_hash = '${TEST_NULLIFIER}';"`);
      }
      return;
    }

    console.log('Claimable WLD:', sigResponse.claimable_wld);
    console.log('Total Earned:', sigResponse.total_earned_wld, 'WLD');
    console.log('Total Earned (wei):', sigResponse.total_earned_wei);
    console.log('Nonce:', sigResponse.nonce);
    console.log('Expiry:', new Date(sigResponse.expiry * 1000).toISOString());
    console.log('Signature:', sigResponse.signature.slice(0, 20) + '...');

    // Step 4: Execute claim transaction (if wallet provided)
    if (wallet) {
      console.log('\n' + '─'.repeat(60));
      console.log('Step 4: Execute Claim Transaction');
      console.log('─'.repeat(60));

      // Check ETH balance for gas
      const ethBalance = await provider.getBalance(walletAddress);
      console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');

      if (ethBalance < ethers.parseEther('0.001')) {
        console.error('⚠ Insufficient ETH for gas. Need at least 0.001 ETH');
        console.log('\nGet test ETH from: https://faucet.worldcoin.org/');
        return;
      }

      console.log('\nSending claim transaction...');

      const tx = await claimContract.claim(
        BigInt(sigResponse.total_earned_wei),
        BigInt(sigResponse.expiry),
        sigResponse.signature
      );

      console.log('TX Hash:', tx.hash);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Confirmed in block:', receipt.blockNumber);
      console.log('Gas used:', receipt.gasUsed.toString());

      // Check for Claimed event
      const claimedEvent = receipt.logs.find((log: ethers.Log) => {
        try {
          const parsed = claimContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          return parsed?.name === 'Claimed';
        } catch {
          return false;
        }
      });

      if (claimedEvent) {
        const parsed = claimContract.interface.parseLog({
          topics: claimedEvent.topics as string[],
          data: claimedEvent.data,
        });
        console.log('\n✅ Claimed:', ethers.formatEther(parsed?.args[1]), 'WLD');
      }

      // Step 5: Verify final state
      console.log('\n' + '─'.repeat(60));
      console.log('Step 5: Verify Final State');
      console.log('─'.repeat(60));

      const [newWldBalance, newNonce, newTotalClaimed] = await Promise.all([
        wldToken.balanceOf(walletAddress),
        claimContract.nonces(walletAddress),
        claimContract.totalClaimed(walletAddress),
      ]);

      console.log('New WLD Balance:', ethers.formatEther(newWldBalance), 'WLD');
      console.log('New Nonce:', newNonce.toString());
      console.log('New Total Claimed:', ethers.formatEther(newTotalClaimed), 'WLD');

      const claimed = newWldBalance - wldBalance;
      console.log('\n🎉 Successfully claimed:', ethers.formatEther(claimed), 'WLD');

      // Notify backend of successful claim
      await fetchApi('/api/credits/claim-complete', {
        method: 'POST',
        body: JSON.stringify({
          nullifier_hash: TEST_NULLIFIER,
          wallet_address: walletAddress,
          amount_claimed: Number(ethers.formatEther(claimed)),
          tx_hash: tx.hash,
          block_number: receipt.blockNumber,
        }),
      });

      console.log('\n✅ Backend notified of claim');

    } else {
      console.log('\n' + '─'.repeat(60));
      console.log('Step 4: Manual Claim Instructions');
      console.log('─'.repeat(60));
      console.log('\nTo claim on-chain, use this data with your wallet:');
      console.log('\nContract:', CONTRACTS.CLAIM_CONTRACT);
      console.log('Function: claim(uint256 totalEarned, uint256 expiry, bytes signature)');
      console.log('\nParameters:');
      console.log('  totalEarned:', sigResponse.total_earned_wei);
      console.log('  expiry:', sigResponse.expiry);
      console.log('  signature:', sigResponse.signature);
      console.log('\nOr use cast:');
      console.log(`\ncast send ${CONTRACTS.CLAIM_CONTRACT} \\`);
      console.log(`  "claim(uint256,uint256,bytes)" \\`);
      console.log(`  ${sigResponse.total_earned_wei} \\`);
      console.log(`  ${sigResponse.expiry} \\`);
      console.log(`  ${sigResponse.signature} \\`);
      console.log(`  --rpc-url ${CONTRACTS.RPC_URL} \\`);
      console.log(`  --private-key YOUR_PRIVATE_KEY`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
