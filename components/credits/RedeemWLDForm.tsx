'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CreditBalanceResponse, CreditConfig } from '@/types/credits';

interface RedeemWLDFormProps {
  balance: CreditBalanceResponse | null;
  config: Partial<CreditConfig> | null;
  walletAddress: string | null;
  onRedeem: (credits: number, walletAddress: string) => Promise<{
    success: boolean;
    error?: string;
    redemptionId?: string;
    wldAmount?: number;
  }>;
}

export function RedeemWLDForm({
  balance,
  config,
  walletAddress,
  onRedeem,
}: RedeemWLDFormProps) {
  const t = useTranslations('credits');
  const [credits, setCredits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ wldAmount: number } | null>(null);

  const wldRate = config?.wld_redemption_rate || 1000;
  const minCredits = config?.min_wld_redemption_credits || 1000;
  const availableCredits = balance?.credits || 0;

  const creditsNum = parseInt(credits, 10) || 0;
  const wldAmount = creditsNum / wldRate;
  const isValid =
    creditsNum >= minCredits &&
    creditsNum <= availableCredits &&
    walletAddress;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !walletAddress) return;

    setLoading(true);
    setError(null);

    const result = await onRedeem(creditsNum, walletAddress);

    if (result.success) {
      setSuccess({ wldAmount: result.wldAmount || 0 });
      setCredits('');
    } else {
      setError(result.error || t('redeem_failed'));
    }

    setLoading(false);
  };

  const setMaxCredits = () => {
    setCredits(availableCredits.toString());
  };

  if (success) {
    return (
      <div className="bg-green-50 rounded-xl p-4 text-center">
        <div className="text-3xl mb-2">✅</div>
        <div className="font-medium text-green-800">{t('redeem_success')}</div>
        <div className="text-sm text-green-600 mt-1">
          {success.wldAmount.toFixed(4)} WLD {t('pending_transfer')}
        </div>
        <button
          onClick={() => setSuccess(null)}
          className="mt-3 text-sm text-green-700 underline"
        >
          {t('redeem_again')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('credits_to_redeem')}
        </label>
        <div className="relative">
          <input
            type="number"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            placeholder={`${t('min')} ${minCredits}`}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            min={minCredits}
            max={availableCredits}
          />
          <button
            type="button"
            onClick={setMaxCredits}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary font-medium"
          >
            MAX
          </button>
        </div>
        <div className="mt-1 text-sm text-gray-500">
          {t('available')}: {availableCredits.toLocaleString()} {t('credits')}
        </div>
      </div>

      {creditsNum > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{t('you_receive')}</span>
            <span className="text-xl font-bold text-primary">
              {wldAmount.toFixed(4)} WLD
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('rate')}: {wldRate} {t('credits')} = 1 WLD
          </div>
        </div>
      )}

      {!walletAddress && (
        <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg">
          {t('wallet_required')}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || loading}
        className={`w-full py-3 rounded-xl font-medium transition-colors ${
          isValid && !loading
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? t('processing') : t('redeem_wld')}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {t('redeem_note')}
      </p>
    </form>
  );
}
