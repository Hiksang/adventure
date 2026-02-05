'use client';

import { useTranslations } from 'next-intl';
import type { CreditBalanceResponse, CreditConfig } from '@/types/credits';

interface CreditBalanceProps {
  balance: CreditBalanceResponse | null;
  config: Partial<CreditConfig> | null;
  loading?: boolean;
  compact?: boolean;
}

export function CreditBalance({
  balance,
  config,
  loading = false,
  compact = false,
}: CreditBalanceProps) {
  const t = useTranslations('credits');

  if (loading) {
    return (
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-24'} bg-gray-200 rounded-lg`} />
    );
  }

  if (!balance) {
    return null;
  }

  const wldRate = config?.wld_redemption_rate || 1000;
  const wldEquivalent = balance.credits / wldRate;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-primary">
          {balance.credits.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">{t('credits')}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white">
      <div className="text-sm opacity-80 mb-1">{t('your_balance')}</div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold">
          {balance.credits.toLocaleString()}
        </span>
        <span className="text-lg opacity-80">{t('credits')}</span>
      </div>

      <div className="flex items-center gap-2 text-sm opacity-90">
        <span>≈</span>
        <span className="font-medium">{wldEquivalent.toFixed(3)} WLD</span>
      </div>

      {balance.pending_redemptions > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20 text-sm">
          <span className="opacity-70">{t('pending')}:</span>
          <span className="ml-2 font-medium">
            {balance.pending_redemptions.toLocaleString()} {t('credits')}
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="opacity-70">{t('total_earned')}</div>
          <div className="font-medium">{balance.total_earned.toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-70">{t('total_redeemed')}</div>
          <div className="font-medium">{balance.total_redeemed.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
