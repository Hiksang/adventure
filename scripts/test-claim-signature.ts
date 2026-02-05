/**
 * WLD Claim Signature Test Script
 *
 * 테스트 항목:
 * 1. 서명 생성
 * 2. 서명 검증
 * 3. DB 상태 확인
 *
 * 실행: npx ts-node --esm scripts/test-claim-signature.ts
 * 또는: npx tsx scripts/test-claim-signature.ts
 */

import { ethers } from 'ethers';

// 환경 설정
const CONFIG = {
  chainId: 4801, // World Chain Sepolia
  claimContract: process.env.NEXT_PUBLIC_WLD_CLAIM_CONTRACT || '0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB',
  rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
  signerPrivateKey: process.env.WLD_SIGNER_PRIVATE_KEY || '',
};

// Private key 검증
if (!CONFIG.signerPrivateKey) {
  console.error('❌ WLD_SIGNER_PRIVATE_KEY environment variable is required');
  console.error('   Set it in .env.local or pass it as an environment variable');
  process.exit(1);
}

// 테스트 데이터
const TEST_USER = {
  walletAddress: '0xef0Dc0662d2718c778d4c2676F3AbCE5E6177eDD',
  totalEarnedWLD: 1.5, // 1.5 WLD
};

// Wei 변환 함수
function toWei(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e18));
}

// 서명 생성 함수
async function generateClaimSignature(
  userAddress: string,
  totalEarnedWLD: number,
  nonce: number,
  expiry: number
) {
  const wallet = new ethers.Wallet(CONFIG.signerPrivateKey);
  const totalEarnedWei = toWei(totalEarnedWLD);

  // 메시지 해시 생성 (컨트랙트와 동일한 방식)
  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
    [CONFIG.chainId, CONFIG.claimContract, userAddress, totalEarnedWei, nonce, expiry]
  );

  // EIP-191 서명
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return {
    signature,
    totalEarnedWei: totalEarnedWei.toString(),
    nonce,
    expiry,
    chainId: CONFIG.chainId,
    contractAddress: CONFIG.claimContract,
    signerAddress: wallet.address,
  };
}

// 서명 검증 함수
async function verifySignature(
  userAddress: string,
  totalEarnedWei: bigint,
  nonce: number,
  expiry: number,
  signature: string
) {
  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
    [CONFIG.chainId, CONFIG.claimContract, userAddress, totalEarnedWei, nonce, expiry]
  );

  const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

  const expectedSigner = new ethers.Wallet(CONFIG.signerPrivateKey).address;

  return {
    valid: recoveredAddress.toLowerCase() === expectedSigner.toLowerCase(),
    recoveredSigner: recoveredAddress,
    expectedSigner,
  };
}

// 컨트랙트 상태 조회
async function getContractState(userAddress: string) {
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const contract = new ethers.Contract(
    CONFIG.claimContract,
    [
      'function nonces(address) view returns (uint256)',
      'function claimed(address) view returns (uint256)',
      'function lastClaimTime(address) view returns (uint256)',
      'function signers(address) view returns (bool)',
      'function availableBalance() view returns (uint256)',
      'function remainingDailyLimit() view returns (uint256)',
      'function remainingUserDailyLimit(address) view returns (uint256)',
      'function getClaimInfo(address, uint256) view returns (uint256, uint256, bool, uint256)',
    ],
    provider
  );

  const [nonce, claimed, lastClaimTime, isSigner, balance, dailyLimit, userDailyLimit] = await Promise.all([
    contract.nonces(userAddress),
    contract.claimed(userAddress),
    contract.lastClaimTime(userAddress),
    contract.signers(new ethers.Wallet(CONFIG.signerPrivateKey).address),
    contract.availableBalance(),
    contract.remainingDailyLimit(),
    contract.remainingUserDailyLimit(userAddress),
  ]);

  return {
    nonce: Number(nonce),
    claimed: Number(claimed) / 1e18,
    lastClaimTime: Number(lastClaimTime),
    lastClaimDate: lastClaimTime > 0 ? new Date(Number(lastClaimTime) * 1000).toISOString() : 'Never',
    isSignerAuthorized: isSigner,
    contractBalance: Number(balance) / 1e18,
    remainingDailyLimit: Number(dailyLimit) / 1e18,
    remainingUserDailyLimit: Number(userDailyLimit) / 1e18,
  };
}

// 메인 테스트 함수
async function runTests() {
  console.log('='.repeat(60));
  console.log('WLD Claim Signature Test');
  console.log('='.repeat(60));
  console.log('\n📋 Configuration:');
  console.log(`   Chain ID: ${CONFIG.chainId}`);
  console.log(`   Contract: ${CONFIG.claimContract}`);
  console.log(`   RPC: ${CONFIG.rpcUrl}`);
  console.log(`   Test User: ${TEST_USER.walletAddress}`);
  console.log(`   Test Amount: ${TEST_USER.totalEarnedWLD} WLD`);

  // 1. 컨트랙트 상태 조회
  console.log('\n' + '─'.repeat(60));
  console.log('📊 Step 1: Contract State');
  console.log('─'.repeat(60));

  try {
    const state = await getContractState(TEST_USER.walletAddress);
    console.log('   User Nonce:', state.nonce);
    console.log('   User Claimed:', state.claimed, 'WLD');
    console.log('   Last Claim:', state.lastClaimDate);
    console.log('   Signer Authorized:', state.isSignerAuthorized ? '✅ Yes' : '❌ No');
    console.log('   Contract Balance:', state.contractBalance, 'WLD');
    console.log('   Remaining Daily Limit:', state.remainingDailyLimit, 'WLD');
    console.log('   Remaining User Daily Limit:', state.remainingUserDailyLimit, 'WLD');

    // 2. 서명 생성
    console.log('\n' + '─'.repeat(60));
    console.log('🔏 Step 2: Generate Signature');
    console.log('─'.repeat(60));

    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1시간 후 만료
    const sigData = await generateClaimSignature(
      TEST_USER.walletAddress,
      TEST_USER.totalEarnedWLD,
      state.nonce,
      expiry
    );

    console.log('   Signer Address:', sigData.signerAddress);
    console.log('   Total Earned (wei):', sigData.totalEarnedWei);
    console.log('   Nonce:', sigData.nonce);
    console.log('   Expiry:', new Date(expiry * 1000).toISOString());
    console.log('   Signature:', sigData.signature.slice(0, 42) + '...');

    // 3. 서명 검증
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Step 3: Verify Signature');
    console.log('─'.repeat(60));

    const verification = await verifySignature(
      TEST_USER.walletAddress,
      BigInt(sigData.totalEarnedWei),
      sigData.nonce,
      expiry,
      sigData.signature
    );

    console.log('   Valid:', verification.valid ? '✅ Yes' : '❌ No');
    console.log('   Recovered Signer:', verification.recoveredSigner);
    console.log('   Expected Signer:', verification.expectedSigner);

    // 4. 클레임 가능 여부 확인
    console.log('\n' + '─'.repeat(60));
    console.log('💰 Step 4: Claim Eligibility');
    console.log('─'.repeat(60));

    const claimable = TEST_USER.totalEarnedWLD - state.claimed;
    const minClaim = 0.01;
    const canClaim = claimable >= minClaim && state.isSignerAuthorized && state.contractBalance >= claimable;

    console.log('   Claimable Amount:', claimable, 'WLD');
    console.log('   Min Claim:', minClaim, 'WLD');
    console.log('   Can Claim:', canClaim ? '✅ Yes' : '❌ No');

    if (!canClaim) {
      if (claimable < minClaim) console.log('   ⚠️  Below minimum claim amount');
      if (!state.isSignerAuthorized) console.log('   ⚠️  Signer not authorized');
      if (state.contractBalance < claimable) console.log('   ⚠️  Insufficient contract balance');
    }

    // 5. API 시뮬레이션
    console.log('\n' + '─'.repeat(60));
    console.log('🌐 Step 5: API Response Simulation');
    console.log('─'.repeat(60));

    const apiResponse = {
      success: true,
      claimable_wld: claimable,
      total_earned_wld: TEST_USER.totalEarnedWLD,
      total_earned_wei: sigData.totalEarnedWei,
      nonce: sigData.nonce,
      expiry: sigData.expiry,
      expires_at: new Date(sigData.expiry * 1000).toISOString(),
      signature: sigData.signature,
      contract: {
        address: sigData.contractAddress,
        chain_id: sigData.chainId,
      },
    };

    console.log('   API Response:');
    console.log(JSON.stringify(apiResponse, null, 2).split('\n').map(l => '   ' + l).join('\n'));

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📋 Test Summary');
    console.log('='.repeat(60));
    console.log('   Signature Generation: ✅ Success');
    console.log('   Signature Verification:', verification.valid ? '✅ Success' : '❌ Failed');
    console.log('   Signer Authorization:', state.isSignerAuthorized ? '✅ Authorized' : '❌ Not Authorized');
    console.log('   Claim Eligibility:', canClaim ? '✅ Eligible' : '❌ Not Eligible');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    process.exit(1);
  }
}

// 실행
runTests().then(() => {
  console.log('\n✅ All tests completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
