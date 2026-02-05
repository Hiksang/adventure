'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CreditBalance } from './CreditBalance';
import { RedeemWLDForm } from './RedeemWLDForm';
import { WLDClaimCard } from './WLDClaimCard';
import { GiftcardCatalog } from './GiftcardCatalog';
import { GiftcardRedeemModal } from './GiftcardRedeemModal';
import { TransactionList } from './TransactionList';
import {
  useCredits,
  useGiftcardCatalog,
  useTransactionHistory,
  useWLDClaimInfo,
} from '@/hooks/useCredits';
import type { GiftcardProduct } from '@/types/credits';

type Tab = 'wld' | 'giftcard' | 'history';

interface CreditsPageProps {
  nullifierHash: string;
  walletAddress: string | null;
}

export function CreditsPage({ nullifierHash, walletAddress }: CreditsPageProps) {
  const t = useTranslations('credits');
  const [activeTab, setActiveTab] = useState<Tab>('wld');
  const [selectedProduct, setSelectedProduct] = useState<GiftcardProduct | null>(null);

  const { balance, config, loading, fetchBalance, redeemForWLD, redeemForGiftcard } = useCredits(nullifierHash);
  const { categories, loading: catalogLoading } = useGiftcardCatalog();
  const { transactions, loading: historyLoading, hasMore, loadMore } = useTransactionHistory(nullifierHash);
  const { claimInfo, loading: claimLoading, refetch: refetchClaimInfo } = useWLDClaimInfo(nullifierHash, walletAddress);

  const handleGiftcardRedeem = async () => {
    if (!selectedProduct) return { success: false, error: 'No product selected' };
    return await redeemForGiftcard(selectedProduct.id);
  };

  // Handle successful WLD claim
  const handleClaimSuccess = useCallback((txHash: string, amount: number) => {
    console.log('[CreditsPage] Claim success:', { txHash, amount });
    // Refresh balances after claim
    fetchBalance();
    refetchClaimInfo();
  }, [fetchBalance, refetchClaimInfo]);

  return (
    <div className="flex-1 bg-gray-50 pb-20">
      {/* Balance card */}
      <div className="p-4">
        <CreditBalance balance={balance} config={config} loading={loading} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('wld')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'wld'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500'
          }`}
        >
          WLD
        </button>
        <button
          onClick={() => setActiveTab('giftcard')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'giftcard'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500'
          }`}
        >
          Gift Cards
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'wld' && (
          <div className="space-y-6">
            {/* WLD Claim Section - Only show if user has claimable WLD */}
            {claimInfo && (claimInfo.claimable_wld > 0 || claimInfo.claimed_wld > 0) && (
              <WLDClaimCard
                nullifierHash={nullifierHash}
                claimableWLD={claimInfo.claimable_wld}
                claimedWLD={claimInfo.claimed_wld}
                walletAddress={walletAddress}
                onClaimSuccess={handleClaimSuccess}
              />
            )}

            {/* Credit to WLD Conversion Section */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">
                {t('convert_credits', { defaultValue: 'Convert Credits to WLD' })}
              </h3>
              <RedeemWLDForm
                balance={balance}
                config={config}
                walletAddress={walletAddress}
                onRedeem={async (credits, wallet) => {
                  const result = await redeemForWLD(credits, wallet);
                  if (result.success) {
                    // Refresh claim info after redemption
                    refetchClaimInfo();
                  }
                  return result;
                }}
              />
            </div>

            {/* How it works */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <h4 className="font-medium text-gray-900 mb-2">
                {t('how_it_works', { defaultValue: 'How it works' })}
              </h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t('step1', { defaultValue: 'Convert your credits to claimable WLD above' })}</li>
                <li>{t('step2', { defaultValue: 'Click "Claim" to send WLD to your wallet' })}</li>
                <li>{t('step3', { defaultValue: 'Confirm the transaction in World App' })}</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'giftcard' && (
          <GiftcardCatalog
            categories={categories}
            userCredits={balance?.credits || 0}
            loading={catalogLoading}
            onSelectProduct={setSelectedProduct}
          />
        )}

        {activeTab === 'history' && (
          <TransactionList
            transactions={transactions}
            loading={historyLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        )}
      </div>

      {/* Gift card redeem modal */}
      {selectedProduct && (
        <GiftcardRedeemModal
          product={selectedProduct}
          userCredits={balance?.credits || 0}
          onConfirm={handleGiftcardRedeem}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
