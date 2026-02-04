'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Container from '@/components/layout/Container';
import Loading from '@/components/ui/Loading';
import StreakCounter from '@/components/analytics/StreakCounter';
import BadgeGrid from '@/components/analytics/BadgeGrid';
import Leaderboard from '@/components/analytics/Leaderboard';
import { useAuth } from '@/hooks/useAuth';
import type { Streak, Badge, LeaderboardEntry } from '@/types';

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const router = useRouter();
  const { user } = useAuth();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => {
        setStreak(d.streak);
        setBadges(d.badges);
        setLeaderboard(d.leaderboard);
      })
      .catch(() => {});
  }, []);

  if (!user) return <Container><Loading /></Container>;

  return (
    <Container>
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4">&larr; Back</button>
      <h2 className="text-xl font-bold mb-6">{t('title')}</h2>

      {streak && <div className="mb-6"><StreakCounter streak={streak} /></div>}

      <div className="mb-6">
        <h3 className="font-semibold mb-3">{t('badges')}</h3>
        <BadgeGrid badges={badges} />
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-3">{t('weeklyLeaderboard')}</h3>
        <Leaderboard entries={leaderboard} />
      </div>
    </Container>
  );
}
