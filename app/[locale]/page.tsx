'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import { useAuth } from '@/hooks/useAuth';
import WalletAuthButton from '@/components/auth/WalletAuthButton';
import DevModeToggle from '@/components/auth/DevModeToggle';
import type { RewardSummary } from '@/types';
import { formatXP, formatWLD } from '@/lib/utils/rewards';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const [summary, setSummary] = useState<RewardSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/rewards?userId=${user.id}`)
      .then(r => r.json())
      .then(d => setSummary(d.summary))
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-2xl font-bold">Advertise</h1>
        <p className="text-gray-500 text-center">Watch ads, complete activities, earn rewards.</p>
        <WalletAuthButton />
        <DevModeToggle />
      </Container>
    );
  }

  const xpInLevel = user.xp % 100;

  return (
    <Container>
      <DevModeToggle />
      <h2 className="text-xl font-bold mt-4">{t('title')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('level', { level: user.level })}</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: t('adsWatched'), value: summary?.ads_watched ?? '-' },
          { label: t('activitiesCompleted'), value: summary?.activities_completed ?? '-' },
          { label: t('totalXP'), value: summary ? formatXP(summary.total_xp) : '-' },
          { label: t('totalWLD'), value: summary ? formatWLD(summary.total_wld_earned) : '-' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">XP Progress</span>
          <span className="text-gray-500">{xpInLevel}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-black h-2 rounded-full" style={{ width: `${xpInLevel}%` }} />
        </div>
      </div>
    </Container>
  );
}
