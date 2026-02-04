'use client';
import type { GiftCard } from '@/types';
import GiftCardItem from './GiftCardItem';

interface GiftCardGridProps {
  giftcards: GiftCard[];
  onSelect: (giftcard: GiftCard) => void;
}

export default function GiftCardGrid({ giftcards, onSelect }: GiftCardGridProps) {
  if (giftcards.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        No giftcards available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {giftcards.map(giftcard => (
        <GiftCardItem
          key={giftcard.id}
          giftcard={giftcard}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
