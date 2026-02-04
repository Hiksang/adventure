'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import Loading from '@/components/ui/Loading';
import WLDBalance from '@/components/rewards/WLDBalance';
import GiftCardGrid from '@/components/rewards/GiftCardGrid';
import PurchaseModal from '@/components/rewards/PurchaseModal';
import PurchaseHistory from '@/components/rewards/PurchaseHistory';
import { useAuth } from '@/hooks/useAuth';
import type { GiftCard, GiftCardPurchase, GiftCardCategory, RewardSummary } from '@/types';

const CATEGORIES: { key: GiftCardCategory | 'all'; emoji: string }[] = [
  { key: 'all', emoji: '🏷️' },
  { key: 'cafe', emoji: '☕' },
  { key: 'food', emoji: '🍔' },
  { key: 'convenience', emoji: '🏪' },
  { key: 'movie', emoji: '🎬' },
  { key: 'game', emoji: '🎮' },
];

export default function RewardsPage() {
  const t = useTranslations('rewards');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [giftcards, setGiftcards] = useState<GiftCard[]>([]);
  const [purchases, setPurchases] = useState<GiftCardPurchase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GiftCardCategory | 'all'>('all');
  const [selectedGiftcard, setSelectedGiftcard] = useState<GiftCard | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/rewards?userId=${user.id}`).then(r => r.json()),
      fetch('/api/giftcards').then(r => r.json()),
    ])
      .then(([rewardsData, giftcardsData]) => {
        if (rewardsData.summary) {
          setBalance(rewardsData.summary.total_wld_earned || 0);
        }
        setGiftcards(giftcardsData.giftcards || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleCategoryChange = async (category: GiftCardCategory | 'all') => {
    setSelectedCategory(category);
    const url = category === 'all' ? '/api/giftcards' : `/api/giftcards?category=${category}`;
    const res = await fetch(url);
    const data = await res.json();
    setGiftcards(data.giftcards || []);
  };

  const handlePurchase = (purchase: GiftCardPurchase) => {
    setPurchases(prev => [purchase, ...prev]);
    setBalance(prev => prev - purchase.price_paid);
    setSelectedGiftcard(null);
  };

  const handleWithdraw = () => {
    alert(t('withdrawComingSoon'));
  };

  if (loading) {
    return <Container><Loading /></Container>;
  }

  if (!user) {
    return (
      <Container className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">{t('signInRequired')}</p>
      </Container>
    );
  }

  return (
    <Container className="pb-24">
      <h2 className="text-xl font-bold mb-4">{t('title')}</h2>

      <WLDBalance
        balance={balance}
        onWithdraw={handleWithdraw}
      />

      <div className="mt-6">
        <h3 className="font-semibold mb-3">{t('giftcardStore')}</h3>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map(({ key, emoji }) => (
            <button
              key={key}
              onClick={() => handleCategoryChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === key
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{emoji}</span>
              <span>{t(`category.${key}`)}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <GiftCardGrid
            giftcards={giftcards}
            onSelect={setSelectedGiftcard}
          />
        </div>
      </div>

      {purchases.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">{t('purchaseHistory')}</h3>
          <PurchaseHistory purchases={purchases} />
        </div>
      )}

      {selectedGiftcard && (
        <PurchaseModal
          giftcard={selectedGiftcard}
          userBalance={balance}
          userId={user.id}
          onClose={() => setSelectedGiftcard(null)}
          onPurchase={handlePurchase}
        />
      )}
    </Container>
  );
}
