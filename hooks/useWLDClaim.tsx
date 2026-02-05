'use client';

import { useState, useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import type { WLDClaimSignatureResponse } from '@/types/credits';

// WLD Claim Contract ABI (minimal for claim function)
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

export type ClaimStatus =
  | 'idle'
  | 'checking-wallet'
  | 'getting-signature'
  | 'awaiting-confirmation'
  | 'sending-transaction'
  | 'confirming'
  | 'success'
  | 'error';

interface ClaimResult {
  success: boolean;
  txHash?: string;
  amount?: number;
  error?: string;
}

interface UseWLDClaimOptions {
  onSuccess?: (txHash: string, amount: number) => void;
  onError?: (error: string) => void;
}

export function useWLDClaim(options?: UseWLDClaimOptions) {
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimAmount, setClaimAmount] = useState<number>(0);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setClaimAmount(0);
  }, []);

  const claim = useCallback(async (
    nullifierHash: string,
    walletAddress: string
  ): Promise<ClaimResult> => {
    setError(null);
    setTxHash(null);

    try {
      // Step 1: Check if MiniKit is available
      setStatus('checking-wallet');

      if (!MiniKit.isInstalled()) {
        throw new Error('World App이 필요합니다. World App에서 열어주세요.');
      }

      // Get wallet address from MiniKit if not provided
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const effectiveWallet = walletAddress || (MiniKit as any).walletAddress;
      if (!effectiveWallet) {
        throw new Error('지갑 주소를 찾을 수 없습니다.');
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(effectiveWallet)) {
        throw new Error('올바르지 않은 지갑 주소 형식입니다.');
      }

      // Step 2: Get claim signature from backend
      setStatus('getting-signature');
      console.log('[WLDClaim] Getting signature for:', { nullifierHash, walletAddress: effectiveWallet });

      const sigResponse = await fetch('/api/credits/claim-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: nullifierHash,
          wallet_address: effectiveWallet,
        }),
      });

      const sigData: WLDClaimSignatureResponse = await sigResponse.json();

      if (!sigResponse.ok || !sigData.success) {
        throw new Error(sigData.error || '서명 생성에 실패했습니다.');
      }

      console.log('[WLDClaim] Signature received:', {
        claimable: sigData.claimable_wld,
        totalEarned: sigData.total_earned_wld,
        nonce: sigData.nonce,
        expiry: sigData.expiry,
        contract: sigData.contract.address,
      });

      setClaimAmount(sigData.claimable_wld);

      // Step 3: Send transaction via MiniKit
      setStatus('awaiting-confirmation');
      console.log('[WLDClaim] Sending transaction via MiniKit...');

      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: sigData.contract.address as `0x${string}`,
            abi: WLD_CLAIM_ABI,
            functionName: 'claim',
            args: [
              BigInt(sigData.total_earned_wei),
              BigInt(sigData.expiry),
              sigData.signature as `0x${string}`,
            ],
          },
        ],
      });

      console.log('[WLDClaim] Transaction response:', { commandPayload, finalPayload });

      // Check for errors
      if (finalPayload.status === 'error') {
        const errorMsg = (finalPayload as any).error_code || 'Transaction failed';
        throw new Error(errorMsg);
      }

      // Step 4: Wait for confirmation
      setStatus('confirming');

      const transactionId = finalPayload.transaction_id;
      if (!transactionId) {
        throw new Error('트랜잭션 ID를 받지 못했습니다.');
      }

      console.log('[WLDClaim] Transaction ID:', transactionId);
      setTxHash(transactionId);

      // Step 5: Success
      setStatus('success');

      // Notify backend of successful claim (fire and forget)
      fetch('/api/credits/claim-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: nullifierHash,
          wallet_address: effectiveWallet,
          amount_claimed: sigData.claimable_wld,
          tx_hash: transactionId,
        }),
      }).catch(console.error);

      options?.onSuccess?.(transactionId, sigData.claimable_wld);

      return {
        success: true,
        txHash: transactionId,
        amount: sigData.claimable_wld,
      };

    } catch (err) {
      console.error('[WLDClaim] Error:', err);
      const errorMessage = err instanceof Error ? err.message : '클레임에 실패했습니다.';
      setError(errorMessage);
      setStatus('error');
      options?.onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [options]);

  return {
    claim,
    reset,
    status,
    error,
    txHash,
    claimAmount,
    isLoading: status !== 'idle' && status !== 'success' && status !== 'error',
  };
}

/**
 * Helper hook to get wallet address from MiniKit
 */
export function useMiniKitWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      setError('World App이 필요합니다.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate nonce for wallet auth
      const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'WLD 클레임을 위해 지갑을 연결합니다.',
        expirationTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      if (finalPayload.status === 'error') {
        throw new Error('지갑 연결에 실패했습니다.');
      }

      const address = finalPayload.address;
      setWalletAddress(address);
      return address;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '지갑 연결에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletAddress: walletAddress || (MiniKit as any).walletAddress,
    connect,
    loading,
    error,
  };
}
