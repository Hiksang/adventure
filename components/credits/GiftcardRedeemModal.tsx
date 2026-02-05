'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { GiftcardProduct } from '@/types/credits';

interface GiftcardRedeemModalProps {
  product: GiftcardProduct;
  userCredits: number;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export function GiftcardRedeemModal({
  product,
  userCredits,
  onConfirm,
  onClose,
}: GiftcardRedeemModalProps) {
  const t = useTranslations('credits');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canAfford = userCredits >= product.credit_cost;

  const handleConfirm = async () => {
    if (!canAfford) return;

    setLoading(true);
    setError(null);

    const result = await onConfirm();

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || t('redeem_failed'));
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={success ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-sm w-full overflow-hidden">
        {success ? (
          // Success state
          <div className="p-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-2">{t('redeem_success')}</h3>
            <p className="text-gray-600 mb-4">
              {t('giftcard_processing')}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {t('check_redemptions')}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium"
            >
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            {/* Product image */}
            <div className="relative aspect-video bg-gray-100">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🎁
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
              <h3 className="text-lg font-bold mb-2">
                {product.name_ko || product.name}
              </h3>
              {product.description && (
                <p className="text-sm text-gray-600 mb-4">
                  {product.description}
                </p>
              )}

              {/* Price info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('cost')}</span>
                  <span className="text-xl font-bold text-primary">
                    {product.credit_cost.toLocaleString()} {t('credits')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{t('face_value')}</span>
                  <span className="font-medium">
                    ₩{product.face_value.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Balance check */}
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-gray-600">{t('your_balance')}</span>
                <span
                  className={`font-medium ${
                    canAfford ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {userCredits.toLocaleString()} {t('credits')}
                </span>
              </div>

              {!canAfford && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
                  {t('insufficient_credits')}
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canAfford || loading}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    canAfford && !loading
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? t('processing') : t('confirm')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
