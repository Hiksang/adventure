'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import RewardCard from '@/components/rewards/RewardCard';
import ClaimButton from '@/components/rewards/ClaimButton';
import Loading from '@/components/ui/Loading';
import { useAuth } from '@/hooks/useAuth';
import { canClaimWLD, formatWLD, formatXP } from '@/lib/utils/rewards';
import type { Reward, RewardSummary } from '@/types';

export default function RewardsPage() {
  const t = useTranslations('rewards');
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRewards = () => {
    if (!user) return;
    fetch(`/api/rewards?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { setRewards(d.rewards); setSummary(d.summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRewards(); }, [user]);

  if (loading) return <Container><Loading /></Container>;

  return (
    <Container>
      <h2 className="text-xl font-bold mb-4">{t('title')}</h2>

      {summary && (
        <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-5 text-white mb-6">
          <p className="text-sm opacity-80">{t('summary')}</p>
          <p className="text-3xl font-bold mt-1">{formatXP(summary.total_xp)}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span>Earned: {formatWLD(summary.total_wld_earned)}</span>
            <span>{t('pendingWLD')}: {formatWLD(summary.pending_wld)}</span>
          </div>
        </div>
      )}

      {summary && summary.pending_wld > 0 && canClaimWLD(summary.total_xp) && (
        <div className="mb-6">
          <ClaimButton
            amount={summary.pending_wld}
            rewardId="pending"
            onClaimed={loadRewards}
          />
        </div>
      )}

      {summary && !canClaimWLD(summary.total_xp) && (
        <p className="text-sm text-gray-500 mb-4 text-center">
          {t('xpNeeded', { xp: 500 - summary.total_xp })}
        </p>
      )}

      <h3 className="font-semibold mb-3">{t('history')}</h3>
      {rewards.length === 0 ? (
        <p className="text-gray-400 text-center py-8">{t('noRewards')}</p>
      ) : (
        <div className="space-y-2">
          {rewards.map(r => <RewardCard key={r.id} reward={r} />)}
        </div>
      )}
    </Container>
  );
}
