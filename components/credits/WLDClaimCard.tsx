'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWLDClaim, useMiniKitWallet, ClaimStatus } from '@/hooks/useWLDClaim';
import {
  useWLDClaimWithPaymaster,
  isPimlicoAvailable,
  isBrowserWalletAvailable,
  PaymasterClaimStatus,
  getPaymasterStatusMessage,
} from '@/hooks/useWLDClaimWithPaymaster';

interface WLDClaimCardProps {
  nullifierHash: string;
  claimableWLD: number;
  claimedWLD: number;
  walletAddress: string | null;
  onClaimSuccess?: (txHash: string, amount: number) => void;
}

const WORLDSCAN_URL = process.env.NEXT_PUBLIC_WORLD_CHAIN_NETWORK === 'mainnet'
  ? 'https://worldscan.org'
  : 'https://sepolia.worldscan.org';

type ClaimMethod = 'minikit' | 'paymaster' | 'none';

export function WLDClaimCard({
  nullifierHash,
  claimableWLD,
  claimedWLD,
  walletAddress,
  onClaimSuccess,
}: WLDClaimCardProps) {
  const t = useTranslations('credits');
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>('none');

  // Determine available claim method on mount
  useEffect(() => {
    if (MiniKit.isInstalled()) {
      setClaimMethod('minikit');
    } else if (isPimlicoAvailable()) {
      setClaimMethod('paymaster');
    } else {
      setClaimMethod('none');
    }
  }, []);

  // MiniKit hooks
  const {
    walletAddress: miniKitWallet,
    connect: connectMiniKitWallet,
    loading: miniKitWalletLoading,
  } = useMiniKitWallet();

  const miniKitClaim = useWLDClaim({
    onSuccess: onClaimSuccess,
  });

  // Paymaster hooks
  const paymasterClaim = useWLDClaimWithPaymaster({
    onSuccess: onClaimSuccess,
  });

  // Determine effective wallet and claim functions based on method
  const effectiveWallet = claimMethod === 'minikit'
    ? walletAddress || miniKitWallet
    : claimMethod === 'paymaster'
      ? walletAddress || paymasterClaim.walletAddress
      : walletAddress;

  const isLoading = claimMethod === 'minikit'
    ? miniKitClaim.isLoading
    : claimMethod === 'paymaster'
      ? paymasterClaim.isLoading
      : false;

  const status = claimMethod === 'minikit'
    ? miniKitClaim.status
    : claimMethod === 'paymaster'
      ? paymasterClaim.status
      : 'idle';

  const error = claimMethod === 'minikit'
    ? miniKitClaim.error
    : claimMethod === 'paymaster'
      ? paymasterClaim.error
      : null;

  const txHash = claimMethod === 'minikit'
    ? miniKitClaim.txHash
    : claimMethod === 'paymaster'
      ? paymasterClaim.txHash
      : null;

  const claimAmount = claimMethod === 'minikit'
    ? miniKitClaim.claimAmount
    : claimMethod === 'paymaster'
      ? paymasterClaim.claimAmount
      : 0;

  const hasClaimable = claimableWLD >= 0.01;
  const canClaim = hasClaimable && effectiveWallet && !isLoading;

  const handleClaim = useCallback(async () => {
    if (claimMethod === 'minikit') {
      if (!effectiveWallet) {
        const connected = await connectMiniKitWallet();
        if (!connected) return;
      }
      await miniKitClaim.claim(nullifierHash, effectiveWallet!);
    } else if (claimMethod === 'paymaster') {
      if (!effectiveWallet) {
        const connected = await paymasterClaim.connectWallet();
        if (!connected) return;
      }
      await paymasterClaim.claim(nullifierHash, effectiveWallet!);
    }
  }, [claimMethod, nullifierHash, effectiveWallet, miniKitClaim, paymasterClaim, connectMiniKitWallet]);

  const handleConnectWallet = useCallback(async () => {
    if (claimMethod === 'minikit') {
      await connectMiniKitWallet();
    } else if (claimMethod === 'paymaster') {
      await paymasterClaim.connectWallet();
    }
  }, [claimMethod, connectMiniKitWallet, paymasterClaim]);

  const handleReset = useCallback(() => {
    if (claimMethod === 'minikit') {
      miniKitClaim.reset();
    } else if (claimMethod === 'paymaster') {
      paymasterClaim.reset();
    }
  }, [claimMethod, miniKitClaim, paymasterClaim]);

  const walletLoading = claimMethod === 'minikit'
    ? miniKitWalletLoading
    : claimMethod === 'paymaster'
      ? paymasterClaim.status === 'connecting-wallet'
      : false;

  // Success state
  if (status === 'success') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <div className="text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-green-800 mb-2">
            {t('claim_success_title', { defaultValue: 'Claim Successful!' })}
          </h3>
          <p className="text-green-700 mb-4">
            {claimAmount.toFixed(4)} WLD {t('sent_to_wallet', { defaultValue: 'sent to your wallet' })}
          </p>
          {txHash && (
            <a
              href={`${WORLDSCAN_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-green-600 underline mb-4"
            >
              {t('view_transaction', { defaultValue: 'View transaction' })} →
            </a>
          )}
          <button
            onClick={handleReset}
            className="w-full mt-2 py-2 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors"
          >
            {t('done', { defaultValue: 'Done' })}
          </button>
        </div>
      </div>
    );
  }

  // No claim method available
  if (claimMethod === 'none') {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {t('claim_wld_title', { defaultValue: 'Claim WLD' })}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('use_world_app', { defaultValue: 'Please use World App to claim WLD' })}
          </p>
          <div className="bg-white rounded-xl p-4 text-sm text-gray-500">
            {claimableWLD.toFixed(4)} WLD available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">
          {t('claim_wld_title', { defaultValue: 'Claim WLD' })}
        </h3>
        <div className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-700">
          World Chain
        </div>
      </div>

      {/* Claimable Amount */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <div className="text-sm text-gray-500 mb-1">
          {t('available_to_claim', { defaultValue: 'Available to claim' })}
        </div>
        <div className="text-3xl font-bold text-purple-700">
          {claimableWLD.toFixed(4)} <span className="text-xl">WLD</span>
        </div>
        {claimedWLD > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            {t('total_claimed', { defaultValue: 'Total claimed' })}: {claimedWLD.toFixed(4)} WLD
          </div>
        )}
      </div>

      {/* Wallet Address Display */}
      {effectiveWallet ? (
        <div className="bg-white/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-500 mb-1">
            {t('wallet_address', { defaultValue: 'Wallet Address' })}
          </div>
          <div className="font-mono text-sm text-gray-700 truncate">
            {effectiveWallet}
          </div>
        </div>
      ) : (
        <button
          onClick={handleConnectWallet}
          disabled={walletLoading}
          className="w-full mb-4 py-3 bg-white border border-purple-200 rounded-xl text-purple-700 font-medium hover:bg-purple-50 transition-colors disabled:opacity-50"
        >
          {walletLoading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              {t('connecting', { defaultValue: 'Connecting...' })}
            </span>
          ) : (
            t('connect_wallet', { defaultValue: 'Connect Wallet' })
          )}
        </button>
      )}

      {/* Status Message */}
      {isLoading && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>
            {claimMethod === 'minikit'
              ? getStatusMessage(status as ClaimStatus, t)
              : getPaymasterStatusMessage(status as PaymasterClaimStatus)}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Min Claim Notice */}
      {claimableWLD > 0 && claimableWLD < 0.01 && (
        <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded-lg mb-4">
          {t('min_claim_notice', { defaultValue: 'Minimum claim amount is 0.01 WLD' })}
        </div>
      )}

      {/* Claim Button */}
      <button
        onClick={handleClaim}
        disabled={!canClaim}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          canClaim
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {getButtonText(
          status as ClaimStatus,
          hasClaimable,
          !!effectiveWallet,
          claimableWLD,
          claimMethod,
          t
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        {t('claim_note', { defaultValue: 'WLD will be sent directly to your wallet on World Chain' })}
      </p>

      {/* Gasless indicator */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {claimMethod === 'minikit'
            ? t('gasless', { defaultValue: 'Gasless via World App' })
            : t('gasless_pimlico', { defaultValue: 'Gasless via Paymaster' })}
        </span>
      </div>
    </div>
  );
}

function getStatusMessage(status: ClaimStatus, t: (key: string, options?: { defaultValue: string }) => string): string {
  switch (status) {
    case 'checking-wallet':
      return t('checking_wallet', { defaultValue: 'Checking wallet...' });
    case 'getting-signature':
      return t('preparing', { defaultValue: 'Preparing claim...' });
    case 'awaiting-confirmation':
      return t('awaiting_confirmation', { defaultValue: 'Confirm in World App...' });
    case 'sending-transaction':
      return t('sending', { defaultValue: 'Sending transaction...' });
    case 'confirming':
      return t('confirming', { defaultValue: 'Confirming transaction...' });
    default:
      return '';
  }
}

function getButtonText(
  status: ClaimStatus,
  hasClaimable: boolean,
  hasWallet: boolean,
  amount: number,
  method: ClaimMethod,
  t: (key: string, options?: { defaultValue: string }) => string
): React.ReactNode {
  if (status !== 'idle' && status !== 'error') {
    return (
      <span className="flex items-center justify-center gap-2">
        <LoadingSpinner />
        {status === 'awaiting-confirmation' && method === 'minikit'
          ? t('confirm_in_app', { defaultValue: 'Confirm in World App' })
          : t('processing', { defaultValue: 'Processing...' })}
      </span>
    );
  }

  if (status === 'error') {
    return t('try_again', { defaultValue: 'Try Again' });
  }

  if (!hasClaimable) {
    return t('nothing_to_claim', { defaultValue: 'Nothing to claim' });
  }

  if (!hasWallet) {
    return t('connect_to_claim', { defaultValue: 'Connect wallet to claim' });
  }

  return (
    <>
      {t('claim_button', { defaultValue: 'Claim' })} {amount.toFixed(4)} WLD
    </>
  );
}

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${sizeClass}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
