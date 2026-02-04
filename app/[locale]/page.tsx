'use client';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FeedContainer } from '@/components/feed';
import Loading from '@/components/ui/Loading';
import AuthFlow from '@/components/auth/AuthFlow';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import LandingPage from '@/components/landing/LandingPage';
import { useAuth } from '@/hooks/useAuth';
import type { FeedItem, FeedResponse } from '@/types';
import { formatWLD } from '@/lib/utils/rewards';
import { trackPageView, startSession } from '@/lib/analytics/events';
import { updateStreak } from '@/lib/gamification/streaks';

export default function FeedPage() {
  const t = useTranslations('feed');
  const { user, nullifierHash, verificationLevel, setAuthData, loading: authLoading } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [wldBalance, setWldBalance] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  // Skip landing if user is already authenticated
  useEffect(() => {
    if (user) {
      setShowLanding(false);
    }
  }, [user]);

  // Track page view and session
  useEffect(() => {
    trackPageView('/', nullifierHash || undefined);
    startSession(nullifierHash || undefined);
  }, [nullifierHash]);

  // Update streak when user is active
  useEffect(() => {
    if (nullifierHash) {
      updateStreak(nullifierHash).catch(console.error);
    }
  }, [nullifierHash]);

  // Load feed with user credentials for targeted ads
  useEffect(() => {
    if (!user) return;

    const feedUrl = nullifierHash
      ? `/api/feed?nullifier=${encodeURIComponent(nullifierHash)}`
      : '/api/feed';

    fetch(feedUrl)
      .then(r => r.json())
      .then((data: FeedResponse) => {
        setItems(data.items);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, nullifierHash]);

  // Load WLD balance
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

    const params = new URLSearchParams({ cursor });
    if (nullifierHash) {
      params.set('nullifier', nullifierHash);
    }

    const res = await fetch(`/api/feed?${params.toString()}`);
    const data: FeedResponse = await res.json();

    setCursor(data.nextCursor);
    setHasMore(data.hasMore);

    return data.items;
  }, [cursor, hasMore, nullifierHash]);

  const handleAuthComplete = useCallback(async (data: {
    nullifierHash: string;
    walletAddress: string;
    verificationLevel: 'orb' | 'device';
  }) => {
    await setAuthData(data);
    setIsNewUser(true);
    setShowOnboarding(true);
  }, [setAuthData]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleGetStarted = useCallback(() => {
    setShowLanding(false);
    setShowAuthFlow(true);
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loading />
      </div>
    );
  }

  // Show landing page for new visitors
  if (!user && showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Show auth flow after clicking "Get Started"
  if (!user && showAuthFlow) {
    return (
      <AuthFlow onComplete={handleAuthComplete}>
        {/* After auth, show onboarding for new users */}
      </AuthFlow>
    );
  }

  // Fallback: show landing if somehow not user and not showing auth
  if (!user) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Show onboarding for new users
  if (showOnboarding && isNewUser) {
    return (
      <OnboardingFlow onComplete={handleOnboardingComplete}>
        {/* Main app will render after onboarding */}
      </OnboardingFlow>
    );
  }

  // Show loading while fetching feed
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loading />
      </div>
    );
  }

  return (
    <>
      {/* Header with balance */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button className="w-10 h-10 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {/* Verification Badge */}
          {verificationLevel && (
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                verificationLevel === 'orb'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {verificationLevel === 'orb' ? '✓ Orb' : '✓ Device'}
            </div>
          )}

          {/* WLD Balance */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-yellow-400 text-sm">💰</span>
            <span className="text-white font-medium text-sm">{formatWLD(wldBalance)}</span>
          </div>
        </div>
      </div>

      {/* Feed */}
      <FeedContainer
        initialItems={items}
        userId={user?.id}
        nullifierHash={nullifierHash || undefined}
        onLoadMore={loadMore}
      />
    </>
  );
}
