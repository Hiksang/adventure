'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GiftCard, GiftCardPurchase } from '@/types';

interface PurchaseModalProps {
  giftcard: GiftCard;
  userBalance: number;
  userId: string;
  onClose: () => void;
  onPurchase: (purchase: GiftCardPurchase) => void;
}

export default function PurchaseModal({
  giftcard,
  userBalance,
  userId,
  onClose,
  onPurchase,
}: PurchaseModalProps) {
  const t = useTranslations('rewards');
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPurchase, setSuccessPurchase] = useState<GiftCardPurchase | null>(null);

  const selectedPrice = giftcard.prices[selectedPriceIndex];
  const canAfford = userBalance >= selectedPrice.wld_price;

  const handlePurchase = async () => {
    if (!canAfford || purchasing) return;

    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch('/api/giftcards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          giftcardId: giftcard.id,
          giftcardName: giftcard.name,
          giftcardBrand: giftcard.brand,
          wldPrice: selectedPrice.wld_price,
        }),
      });

      const data = await res.json();

      if (data.success && data.purchase) {
        setSuccessPurchase(data.purchase);
        onPurchase(data.purchase);
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setPurchasing(false);
    }
  };

  if (successPurchase) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">{t('purchaseSuccess')}</h3>
            <p className="text-gray-600 text-sm mb-4">{giftcard.brand} - {giftcard.name}</p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">{t('barcode')}</p>
              <p className="font-mono text-lg font-bold tracking-wider">{successPurchase.barcode}</p>
              {successPurchase.pin && (
                <>
                  <p className="text-xs text-gray-500 mt-3 mb-1">PIN</p>
                  <p className="font-mono text-lg font-bold">{successPurchase.pin}</p>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full bg-black text-white py-3 rounded-xl font-medium"
            >
              {t('done')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-4">
          <img
            src={giftcard.image_url}
            alt={giftcard.name}
            className="w-20 h-20 rounded-xl object-cover"
          />
          <div>
            <p className="text-xs text-gray-500">{giftcard.brand}</p>
            <h3 className="font-bold">{giftcard.name}</h3>
            {giftcard.description && (
              <p className="text-xs text-gray-500 mt-1">{giftcard.description}</p>
            )}
          </div>
        </div>

        {giftcard.prices.length > 1 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">{t('selectAmount')}</p>
            <div className="flex gap-2 flex-wrap">
              {giftcard.prices.map((price, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPriceIndex(index)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPriceIndex === index
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₩{price.amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('price')}</span>
            <span className="font-bold text-purple-600">{selectedPrice.wld_price.toFixed(2)} WLD</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">{t('yourBalance')}</span>
            <span className={canAfford ? 'text-gray-700' : 'text-red-500'}>{userBalance.toFixed(2)} WLD</span>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        {!canAfford && (
          <p className="text-red-500 text-sm text-center mb-4">{t('insufficientBalance')}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-700"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handlePurchase}
            disabled={!canAfford || purchasing}
            className="flex-1 py-3 rounded-xl font-medium bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purchasing ? t('processing') : t('purchase')}
          </button>
        </div>
      </div>
    </div>
  );
}
