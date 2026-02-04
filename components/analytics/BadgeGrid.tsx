'use client';
import type { Badge } from '@/types';

export default function BadgeGrid({ badges, limit }: { badges: Badge[]; limit?: number }) {
  const shown = limit ? badges.slice(0, limit) : badges;

  return (
    <div className="grid grid-cols-4 gap-3">
      {shown.map(badge => (
        <div
          key={badge.id}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl ${badge.unlocked ? 'bg-gray-50' : 'bg-gray-50 opacity-40'}`}
        >
          <span className="text-2xl">{badge.icon}</span>
          <span className="text-[10px] text-center leading-tight font-medium">{badge.name}</span>
        </div>
      ))}
    </div>
  );
}
