'use client';
import type { GiftCard } from '@/types';

interface GiftCardItemProps {
  giftcard: GiftCard;
  onSelect: (giftcard: GiftCard) => void;
}

export default function GiftCardItem({ giftcard, onSelect }: GiftCardItemProps) {
  const lowestPrice = Math.min(...giftcard.prices.map(p => p.wld_price));

  return (
    <button
      onClick={() => onSelect(giftcard)}
      className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow text-left"
    >
      <div className="aspect-square bg-gray-100 relative">
        <img
          src={giftcard.image_url}
          alt={giftcard.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500">{giftcard.brand}</p>
        <p className="text-sm font-medium truncate">{giftcard.name}</p>
        <p className="text-sm font-bold text-purple-600 mt-1">
          {lowestPrice.toFixed(2)} WLD
        </p>
      </div>
    </button>
  );
}
