'use client';
import { useTranslations } from 'next-intl';

interface Stats {
  level: number;
  totalXP: number;
  totalWLD: number;
  adsWatched: number;
  quizAccuracy: number;
  streak: number;
}

interface StatsGridProps {
  stats: Stats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const t = useTranslations('profile');

  const mainStats = [
    { label: t('level'), value: `Lv.${stats.level}` },
    { label: t('totalXP'), value: `${stats.totalXP.toLocaleString()} XP` },
    { label: t('totalWLD'), value: `${stats.totalWLD.toFixed(2)} WLD` },
  ];

  const detailStats = [
    { label: t('adsWatched'), value: `${stats.adsWatched}${t('count')}`, icon: '📺' },
    { label: t('quizAccuracy'), value: `${stats.quizAccuracy}%`, icon: '🎯' },
    { label: t('streak'), value: `${stats.streak}${t('days')}`, icon: '🔥' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {mainStats.map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-3">{t('statistics')}</h3>
        <div className="space-y-2">
          {detailStats.map(({ label, value, icon }) => (
            <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span>{icon}</span>
                {label}
              </span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
