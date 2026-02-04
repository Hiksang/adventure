'use client';
import { useTranslations } from 'next-intl';
import { formatWLD } from '@/lib/utils/rewards';

interface WLDBalanceProps {
  balance: number;
  krwRate?: number;
  onWithdraw?: () => void;
}

export default function WLDBalance({ balance, krwRate = 3000, onWithdraw }: WLDBalanceProps) {
  const t = useTranslations('rewards');
  const krwValue = Math.floor(balance * krwRate);

  return (
    <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-5 text-white">
      <p className="text-sm opacity-80">{t('myWLD')}</p>
      <p className="text-3xl font-bold mt-1">{formatWLD(balance)}</p>
      <p className="text-sm opacity-70 mt-1">
        ≈ ₩{krwValue.toLocaleString()}
      </p>
      {onWithdraw && (
        <button
          onClick={onWithdraw}
          className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl font-medium transition-colors"
        >
          {t('withdrawWLD')}
        </button>
      )}
    </div>
  );
}
