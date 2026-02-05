import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ACTIVE_CONFIG } from './signer';

// WLDRewardClaim ABI (필요한 부분만)
const CLAIM_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'claimed',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'lastClaimTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'totalClaimed', type: 'uint256' },
      { indexed: false, name: 'nextClaimTime', type: 'uint256' },
    ],
    name: 'Claimed',
    type: 'event',
  },
] as const;

/**
 * 특정 유저의 온체인 클레임 상태 조회
 */
export async function getOnChainClaimStatus(walletAddress: string) {
  const { ethers } = await import('ethers');

  const provider = new ethers.JsonRpcProvider(ACTIVE_CONFIG.rpcUrl);
  const contract = new ethers.Contract(
    ACTIVE_CONFIG.claimContract,
    CLAIM_ABI,
    provider
  );

  const [claimed, lastClaimTime] = await Promise.all([
    contract.claimed(walletAddress),
    contract.lastClaimTime(walletAddress),
  ]);

  return {
    claimedWei: claimed.toString(),
    claimedWLD: Number(claimed) / 1e18,
    lastClaimTime: Number(lastClaimTime),
    lastClaimDate: lastClaimTime > 0 ? new Date(Number(lastClaimTime) * 1000) : null,
  };
}

/**
 * DB와 온체인 상태 동기화
 */
export async function syncUserClaimStatus(nullifierHash: string) {
  const supabase = await createServerSupabaseClient();

  // 유저 정보 조회
  const { data: user } = await supabase
    .from('users')
    .select('wallet_address, wld_claimable, wld_claimed')
    .eq('nullifier_hash', nullifierHash)
    .single();

  if (!user?.wallet_address) {
    return { synced: false, error: 'No wallet address' };
  }

  // 온체인 상태 조회
  const onChainStatus = await getOnChainClaimStatus(user.wallet_address);

  // DB의 총 적립량 (claimable + claimed)
  const dbTotalEarned = (Number(user.wld_claimable) || 0) + (Number(user.wld_claimed) || 0);

  // 온체인에서 클레임한 양
  const onChainClaimed = onChainStatus.claimedWLD;

  // DB 업데이트: 온체인 클레임 양 반영
  const newClaimable = Math.max(0, dbTotalEarned - onChainClaimed);
  const newClaimed = onChainClaimed;

  if (newClaimed !== Number(user.wld_claimed)) {
    await supabase
      .from('users')
      .update({
        wld_claimable: newClaimable,
        wld_claimed: newClaimed,
      })
      .eq('nullifier_hash', nullifierHash);

    return {
      synced: true,
      previous: {
        claimable: Number(user.wld_claimable),
        claimed: Number(user.wld_claimed),
      },
      current: {
        claimable: newClaimable,
        claimed: newClaimed,
      },
      onChain: onChainStatus,
    };
  }

  return { synced: false, message: 'Already in sync', onChain: onChainStatus };
}

/**
 * 모든 유저 동기화 (Cron job용)
 */
export async function syncAllUsers() {
  const supabase = await createServerSupabaseClient();

  // 지갑 주소가 있고 클레임 가능한 WLD가 있는 유저들
  const { data: users } = await supabase
    .from('users')
    .select('nullifier_hash, wallet_address')
    .not('wallet_address', 'is', null)
    .gt('wld_claimable', 0);

  if (!users?.length) {
    return { synced: 0 };
  }

  let syncedCount = 0;
  for (const user of users) {
    try {
      const result = await syncUserClaimStatus(user.nullifier_hash);
      if (result.synced) syncedCount++;
    } catch (error) {
      console.error(`Sync failed for ${user.nullifier_hash}:`, error);
    }
  }

  return { synced: syncedCount, total: users.length };
}
