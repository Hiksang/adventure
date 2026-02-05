/**
 * WLD Reward Flow Test Script
 *
 * Tests the complete flow:
 * 1. Create test user
 * 2. Earn credits via ad views
 * 3. Check balance
 * 4. Redeem credits for WLD
 * 5. Get claim signature
 * 6. Complete claim (simulate)
 *
 * Usage: npx tsx scripts/test-reward-flow.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user data
const TEST_NULLIFIER = '0x' + '1'.repeat(64); // Test nullifier hash
const TEST_WALLET = '0x' + 'a'.repeat(40); // Test wallet address

interface ApiResponse {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

async function fetchApi(endpoint: string, options?: RequestInit): Promise<ApiResponse> {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n→ ${options?.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`  ✗ Error ${response.status}:`, data.error || data);
      return { success: false, error: data.error || 'Request failed', ...data };
    }

    console.log(`  ✓ Success:`, JSON.stringify(data, null, 2).split('\n').slice(0, 10).join('\n'));
    return data;
  } catch (error) {
    console.log(`  ✗ Network error:`, error);
    return { success: false, error: String(error) };
  }
}

async function setupTestUser(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 0: Setup Test User');
  console.log('='.repeat(60));

  // Create user via direct DB or auth endpoint
  const result = await fetchApi('/api/auth/worldid', {
    method: 'POST',
    body: JSON.stringify({
      nullifier_hash: TEST_NULLIFIER,
      merkle_root: '0x' + '0'.repeat(64),
      proof: '0x' + '0'.repeat(512),
      verification_level: 'orb',
      action: 'login',
      // For testing, we might need to bypass verification
    }),
  });

  // If user creation fails, try to continue (user might exist)
  if (!result.success && !result.error?.includes('already exists')) {
    console.log('  ℹ User might already exist or auth is strict. Continuing...');
  }

  return true;
}

async function testEarnCredits(): Promise<number> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 1: Earn Credits via Ad Views');
  console.log('='.repeat(60));

  let totalEarned = 0;

  // Simulate 5 ad views
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Ad View ${i}/5 ---`);

    const result = await fetchApi('/api/credits/earn', {
      method: 'POST',
      body: JSON.stringify({
        nullifier_hash: TEST_NULLIFIER,
        type: 'ad_view',
        reference_id: `test-ad-${Date.now()}-${i}`,
      }),
    });

    if (result.credits_earned) {
      totalEarned += result.credits_earned as number;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n  📊 Total credits earned: ${totalEarned}`);
  return totalEarned;
}

async function testGetBalance(): Promise<{ balance: number; config: unknown }> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 2: Check Credit Balance');
  console.log('='.repeat(60));

  const result = await fetchApi(`/api/credits?nullifier=${TEST_NULLIFIER}`);

  return {
    balance: (result.balance as number) || 0,
    config: result.config,
  };
}

async function testRedeemForWLD(credits: number): Promise<number> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 3: Redeem Credits for WLD');
  console.log('='.repeat(60));

  // First check redemption info
  const info = await fetchApi('/api/credits/redeem/wld');
  console.log('\n  Redemption info:', info);

  if (credits < ((info.min_credits as number) || 100)) {
    console.log(`  ⚠ Not enough credits. Need at least ${info.min_credits}`);
    return 0;
  }

  const result = await fetchApi('/api/credits/redeem/wld', {
    method: 'POST',
    body: JSON.stringify({
      nullifier_hash: TEST_NULLIFIER,
      credits,
      wallet_address: TEST_WALLET,
    }),
  });

  return (result.wld_amount as number) || 0;
}

async function testGetClaimSignature(): Promise<{
  signature?: string;
  claimable?: number;
  expiry?: number;
}> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 4: Get WLD Claim Signature');
  console.log('='.repeat(60));

  // First check claim info
  const info = await fetchApi(`/api/credits/claim-signature?nullifier=${TEST_NULLIFIER}&wallet=${TEST_WALLET}`);
  console.log('\n  Claim info:', info);

  if ((info.claimable_wld as number) < 0.01) {
    console.log('  ⚠ Not enough claimable WLD (min 0.01)');
    return {};
  }

  // Get actual signature
  const result = await fetchApi('/api/credits/claim-signature', {
    method: 'POST',
    body: JSON.stringify({
      nullifier_hash: TEST_NULLIFIER,
      wallet_address: TEST_WALLET,
    }),
  });

  return {
    signature: result.signature as string,
    claimable: result.claimable_wld as number,
    expiry: result.expiry as number,
  };
}

async function testClaimComplete(amount: number): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 5: Complete Claim (Simulate On-Chain)');
  console.log('='.repeat(60));

  // Simulate a successful on-chain transaction
  const fakeTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

  const result = await fetchApi('/api/credits/claim-complete', {
    method: 'POST',
    body: JSON.stringify({
      nullifier_hash: TEST_NULLIFIER,
      wallet_address: TEST_WALLET,
      amount_claimed: amount,
      tx_hash: fakeTxHash,
      block_number: 12345678,
    }),
  });

  return result.success === true;
}

async function testGetHistory(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Step 6: Check Transaction History');
  console.log('='.repeat(60));

  await fetchApi(`/api/credits/history?nullifier=${TEST_NULLIFIER}&limit=5`);
  await fetchApi(`/api/credits/redemptions?nullifier=${TEST_NULLIFIER}&limit=5`);
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  WLD REWARD FLOW TEST');
  console.log('  Base URL:', BASE_URL);
  console.log('  Test Nullifier:', TEST_NULLIFIER.slice(0, 20) + '...');
  console.log('  Test Wallet:', TEST_WALLET.slice(0, 20) + '...');
  console.log('═'.repeat(60));

  try {
    // Step 0: Setup user
    await setupTestUser();

    // Step 1: Earn credits
    const earned = await testEarnCredits();

    // Step 2: Check balance
    const { balance, config } = await testGetBalance();
    console.log(`\n  💰 Current balance: ${balance} credits`);
    console.log(`  ⚙ Config:`, config);

    // Step 3: Redeem for WLD (use half of balance)
    const redeemAmount = Math.floor(balance / 2);
    if (redeemAmount > 0) {
      const wldAmount = await testRedeemForWLD(redeemAmount);
      console.log(`\n  🪙 WLD received: ${wldAmount}`);
    }

    // Step 4: Get claim signature
    const { signature, claimable, expiry } = await testGetClaimSignature();
    if (signature) {
      console.log(`\n  ✍ Signature obtained`);
      console.log(`  💎 Claimable: ${claimable} WLD`);
      console.log(`  ⏱ Expires: ${new Date((expiry || 0) * 1000).toISOString()}`);

      // Step 5: Complete claim
      if (claimable && claimable > 0) {
        const completed = await testClaimComplete(claimable);
        console.log(`\n  ${completed ? '✅' : '❌'} Claim ${completed ? 'completed' : 'failed'}`);
      }
    }

    // Step 6: Check history
    await testGetHistory();

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
