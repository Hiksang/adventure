'use client';
import Link from 'next/link';
import type { Activity } from '@/types';
import { useLocale } from '@/hooks/useLocale';

export default function ActivityCard({ activity }: { activity: Activity }) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}/activities/${activity.id}`}>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
            activity.type === 'code_entry' ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {activity.type === 'code_entry' ? '\ud83d\udd11' : '\ud83e\udde0'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{activity.title}</p>
            <p className="text-xs text-gray-500 truncate">{activity.description}</p>
          </div>
          <span className="bg-gray-100 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
            +{activity.xp_reward} XP
          </span>
        </div>
      </div>
    </Link>
  );
}
