'use client';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FeedContainer } from '@/components/feed';
import Loading from '@/components/ui/Loading';
import WalletAuthButton from '@/components/auth/WalletAuthButton';
import DevModeToggle from '@/components/auth/DevModeToggle';
import { useAuth } from '@/hooks/useAuth';
import type { FeedItem, FeedResponse, RewardSummary } from '@/types';
import { formatWLD } from '@/lib/utils/rewards';

export default function FeedPage() {
  const t = useTranslations('feed');
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [wldBalance, setWldBalance] = useState<number>(0);

  useEffect(() => {
    fetch('/api/feed')
      .then(r => r.json())
      .then((data: FeedResponse) => {
        setItems(data.items);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/rewards?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.summary) {
          setWldBalance(d.summary.total_wld_earned || 0);
        }
      })
      .catch(() => {});
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return [];

    const res = await fetch(`/api/feed?cursor=${cursor}`);
    const data: FeedResponse = await res.json();

    setCursor(data.nextCursor);
    setHasMore(data.hasMore);

    return data.items;
  }, [cursor, hasMore]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 bg-gradient-to-br from-purple-600 to-blue-600">
        <h1 className="text-3xl font-bold text-white">Advertise</h1>
        <p className="text-white/80 text-center">{t('welcomeMessage')}</p>
        <WalletAuthButton />
        <DevModeToggle />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loading />
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button className="w-10 h-10 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="text-yellow-400 text-sm">💰</span>
          <span className="text-white font-medium text-sm">{formatWLD(wldBalance)}</span>
        </div>
      </div>

      <FeedContainer
        initialItems={items}
        userId={user.id}
        onLoadMore={loadMore}
      />
    </>
  );
}
