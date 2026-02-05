'use client';

/**
 * WLD Claim Hook with Pimlico Paymaster Support
 *
 * This hook provides gasless WLD claiming for web browsers using:
 * - Pimlico Bundler for UserOperation submission
 * - Pimlico Verifying Paymaster for gas sponsorship
 *
 * For users in World App, use useWLDClaim instead (uses MiniKit).
 */

import { useState, useCallback, useEffect } from 'react';
import { type Address } from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import type { WLDClaimSignatureResponse } from '@/types/credits';

// Environment configuration
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
const NETWORK = process.env.NEXT_PUBLIC_WORLD_CHAIN_NETWORK || 'sepolia';
const targetChain = NETWORK === 'mainnet' ? worldchain : worldchainSepolia;

export type PaymasterClaimStatus =
  | 'idle'
  | 'connecting-wallet'
  | 'getting-signature'
  | 'building-userop'
  | 'sponsoring'
  | 'sending'
  | 'confirming'
  | 'success'
  | 'error';

interface PaymasterClaimResult {
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  amount?: number;
  error?: string;
}

interface UseWLDClaimWithPaymasterOptions {
  onSuccess?: (txHash: string, amount: number) => void;
  onError?: (error: string) => void;
}

/**
 * Check if Pimlico paymaster is available
 */
export function isPimlicoAvailable(): boolean {
  return !!PIMLICO_API_KEY;
}

/**
 * Check if browser wallet (e.g., MetaMask) is available
 */
export function isBrowserWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { ethereum?: unknown }).ethereum;
}

/**
 * Hook for claiming WLD with Pimlico paymaster sponsorship
 *
 * Note: This uses a server-side relay to sponsor transactions.
 * The user's wallet only signs the message, gas is paid by our backend.
 */
export function useWLDClaimWithPaymaster(options?: UseWLDClaimWithPaymasterOptions) {
  const [status, setStatus] = useState<PaymasterClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [userOpHash, setUserOpHash] = useState<string | null>(null);
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Check wallet connection on mount
  useEffect(() => {
    const checkWallet = async () => {
      if (!isBrowserWalletAvailable()) return;

      try {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0] as Address);
          setIsWalletConnected(true);
        }
      } catch {
        // Wallet not connected
      }
    };

    checkWallet();
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setUserOpHash(null);
    setClaimAmount(0);
  }, []);

  /**
   * Connect browser wallet
   */
  const connectWallet = useCallback(async (): Promise<Address | null> => {
    if (!isBrowserWalletAvailable()) {
      setError('브라우저 지갑이 필요합니다. MetaMask를 설치해주세요.');
      return null;
    }

    setStatus('connecting-wallet');
    setError(null);

    try {
      const ethereum = (window as unknown as { ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;

      // Request account access
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('지갑 연결이 거부되었습니다.');
      }

      const address = accounts[0] as Address;
      setWalletAddress(address);
      setIsWalletConnected(true);

      // Switch to World Chain if needed
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
        });
      } catch (switchError: unknown) {
        // Chain not added, try to add it
        if ((switchError as { code: number }).code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChain.id.toString(16)}`,
              chainName: targetChain.name,
              nativeCurrency: targetChain.nativeCurrency,
              rpcUrls: [targetChain.rpcUrls.default.http[0]],
              blockExplorerUrls: [targetChain.blockExplorers?.default.url],
            }],
          });
        }
      }

      setStatus('idle');
      return address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '지갑 연결에 실패했습니다.';
      setError(errorMessage);
      setStatus('error');
      return null;
    }
  }, []);

  /**
   * Claim WLD using Pimlico-sponsored transaction
   *
   * Flow:
   * 1. Get claim signature from backend
   * 2. Submit sponsored transaction via backend relay
   * 3. Backend uses Pimlico paymaster to sponsor gas
   */
  const claim = useCallback(async (
    nullifierHash: string,
    walletAddr?: string
  ): Promise<PaymasterClaimResult> => {
    setError(null);
    setTxHash(null);
    setUserOpHash(null);

    const effectiveWallet = (walletAddr || walletAddress) as Address;

    if (!effectiveWallet) {
      setError('지갑을 먼저 연결해주세요.');
      setStatus('error');
      return { success: false, error: '지갑을 먼저 연결해주세요.' };
    }

    try {
      // Step 1: Get claim signature from backend
      setStatus('getting-signature');
      console.log('[PaymasterClaim] Getting signature for:', { nullifierHash, wallet: effectiveWallet });

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

      console.log('[PaymasterClaim] Signature received:', {
        claimable: sigData.claimable_wld,
        totalEarned: sigData.total_earned_wld,
        nonce: sigData.nonce,
      });

      setClaimAmount(sigData.claimable_wld);

      // Step 2: Submit sponsored transaction via backend
      setStatus('sponsoring');
      console.log('[PaymasterClaim] Submitting sponsored transaction...');

      const sponsorResponse = await fetch('/api/credits/claim-sponsored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: nullifierHash,
          wallet_address: effectiveWallet,
          contract_address: sigData.contract.address,
          total_earned_wei: sigData.total_earned_wei,
          expiry: sigData.expiry,
          signature: sigData.signature,
        }),
      });

      const sponsorData = await sponsorResponse.json();

      if (!sponsorResponse.ok || !sponsorData.success) {
        throw new Error(sponsorData.error || 'Sponsored transaction failed');
      }

      setStatus('sending');
      console.log('[PaymasterClaim] UserOp Hash:', sponsorData.userOpHash);

      if (sponsorData.userOpHash) {
        setUserOpHash(sponsorData.userOpHash);
      }

      // Step 3: Wait for confirmation
      setStatus('confirming');

      // Poll for transaction receipt
      const receipt = await waitForUserOpReceipt(sponsorData.userOpHash);

      if (!receipt.success) {
        throw new Error(receipt.error || 'Transaction failed');
      }

      const finalTxHash = receipt.transactionHash || sponsorData.userOpHash;
      setTxHash(finalTxHash);
      setStatus('success');

      // Notify backend of successful claim
      await fetch('/api/credits/claim-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: nullifierHash,
          wallet_address: effectiveWallet,
          amount_claimed: sigData.claimable_wld,
          tx_hash: finalTxHash,
          user_op_hash: sponsorData.userOpHash,
        }),
      }).catch(console.error);

      options?.onSuccess?.(finalTxHash, sigData.claimable_wld);

      return {
        success: true,
        txHash: finalTxHash,
        userOpHash: sponsorData.userOpHash,
        amount: sigData.claimable_wld,
      };

    } catch (err) {
      console.error('[PaymasterClaim] Error:', err);
      const errorMessage = err instanceof Error ? err.message : '클레임에 실패했습니다.';
      setError(errorMessage);
      setStatus('error');
      options?.onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [walletAddress, options]);

  return {
    // Actions
    claim,
    connectWallet,
    reset,

    // State
    status,
    error,
    txHash,
    userOpHash,
    claimAmount,
    walletAddress,
    isWalletConnected,
    isLoading: status !== 'idle' && status !== 'success' && status !== 'error',

    // Availability
    isPimlicoAvailable: isPimlicoAvailable(),
    isBrowserWalletAvailable: isBrowserWalletAvailable(),
  };
}

/**
 * Poll for UserOperation receipt
 */
async function waitForUserOpReceipt(
  userOpHash: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`/api/credits/claim-status?userOpHash=${userOpHash}`);
      const data = await response.json();

      if (data.status === 'success') {
        return { success: true, transactionHash: data.transactionHash };
      }

      if (data.status === 'failed') {
        return { success: false, error: data.error || 'Transaction failed' };
      }

      // Still pending, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch {
      // Retry on error
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  return { success: false, error: 'Transaction timeout' };
}

/**
 * Get status message for display
 */
export function getPaymasterStatusMessage(status: PaymasterClaimStatus): string {
  switch (status) {
    case 'connecting-wallet':
      return '지갑 연결 중...';
    case 'getting-signature':
      return '서명 생성 중...';
    case 'building-userop':
      return '트랜잭션 준비 중...';
    case 'sponsoring':
      return '가스비 스폰서 중...';
    case 'sending':
      return '트랜잭션 전송 중...';
    case 'confirming':
      return '트랜잭션 확인 중...';
    default:
      return '';
  }
}
