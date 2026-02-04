'use client';
import { useTranslations } from 'next-intl';
import type { GiftCardPurchase } from '@/types';

interface PurchaseHistoryProps {
  purchases: GiftCardPurchase[];
}

export default function PurchaseHistory({ purchases }: PurchaseHistoryProps) {
  const t = useTranslations('rewards');

  if (purchases.length === 0) {
    return (
      <p className="text-gray-400 text-center py-8">{t('noPurchases')}</p>
    );
  }

  return (
    <div className="space-y-2">
      {purchases.map(purchase => {
        const date = new Date(purchase.purchased_at);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;

        return (
          <div
            key={purchase.id}
            className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
          >
            <div>
              <p className="font-medium text-sm">{purchase.giftcard_brand}</p>
              <p className="text-xs text-gray-500">{purchase.giftcard_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-purple-600">-{purchase.price_paid.toFixed(2)} WLD</p>
              <p className="text-xs text-gray-400">{formattedDate}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
