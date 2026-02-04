'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import Loading from '@/components/ui/Loading';
import WalletAuthButton from '@/components/auth/WalletAuthButton';
import DevModeToggle from '@/components/auth/DevModeToggle';
import { ProfileHeader, StatsGrid, SettingsList } from '@/components/profile';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { calculateLevel } from '@/lib/utils/rewards';
import type { RewardSummary } from '@/types';

interface UserStats {
  level: number;
  totalXP: number;
  totalWLD: number;
  adsWatched: number;
  quizAccuracy: number;
  streak: number;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetch(`/api/rewards?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const summary: RewardSummary = data.summary || {
          total_xp: user.xp,
          total_wld_earned: 0,
          pending_wld: 0,
        };

        setStats({
          level: calculateLevel(summary.total_xp),
          totalXP: summary.total_xp,
          totalWLD: summary.total_wld_earned,
          adsWatched: 47,
          quizAccuracy: 78,
          streak: 5,
        });
      })
      .catch(() => {
        setStats({
          level: calculateLevel(user.xp),
          totalXP: user.xp,
          totalWLD: 0,
          adsWatched: 0,
          quizAccuracy: 0,
          streak: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">{t('signInRequired')}</p>
        <WalletAuthButton />
      </Container>
    );
  }

  if (loading) {
    return <Container><Loading /></Container>;
  }

  return (
    <Container className="pb-24">
      <ProfileHeader user={user} />
      <DevModeToggle />

      {stats && (
        <div className="mt-4">
          <StatsGrid stats={stats} />
        </div>
      )}

      <div className="mt-6">
        <SettingsList locale={locale} onLogout={logout} />
      </div>
    </Container>
  );
}
