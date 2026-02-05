'use client';

import { useTranslations } from 'next-intl';
import type { CreditTransaction } from '@/types/credits';

interface TransactionListProps {
  transactions: CreditTransaction[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function TransactionList({
  transactions,
  loading = false,
  hasMore = false,
  onLoadMore,
}: TransactionListProps) {
  const t = useTranslations('credits');

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse h-16 bg-gray-100 rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('no_transactions')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-3 text-sm text-primary font-medium"
        >
          {loading ? t('loading') : t('load_more')}
        </button>
      )}
    </div>
  );
}

interface TransactionItemProps {
  transaction: CreditTransaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const t = useTranslations('credits');
  const isEarn = transaction.amount > 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'earn_ad_view':
        return t('tx_ad_view');
      case 'earn_quiz':
        return t('tx_quiz');
      case 'earn_bonus':
        return t('tx_bonus');
      case 'earn_referral':
        return t('tx_referral');
      case 'redeem_wld':
        return t('tx_redeem_wld');
      case 'redeem_giftcard':
        return t('tx_redeem_giftcard');
      case 'admin_adjust':
        return t('tx_admin');
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earn_ad_view':
        return '📺';
      case 'earn_quiz':
        return '❓';
      case 'earn_bonus':
        return '🎁';
      case 'earn_referral':
        return '👥';
      case 'redeem_wld':
        return '🌐';
      case 'redeem_giftcard':
        return '🎟️';
      case 'admin_adjust':
        return '⚙️';
      default:
        return '💳';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="text-2xl">{getTypeIcon(transaction.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{getTypeLabel(transaction.type)}</div>
        <div className="text-xs text-gray-500">{formatDate(transaction.created_at)}</div>
      </div>
      <div
        className={`font-bold ${
          isEarn ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {isEarn ? '+' : ''}
        {transaction.amount.toLocaleString()}
      </div>
    </div>
  );
}
