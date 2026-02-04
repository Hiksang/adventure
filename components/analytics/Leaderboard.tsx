'use client';
import type { LeaderboardEntry } from '@/types';

export default function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div key={entry.rank} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <span className={`w-7 text-center font-bold text-sm ${entry.rank <= 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
            {entry.rank}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{entry.username}</p>
            <p className="text-xs text-gray-500">Lv.{entry.level}</p>
          </div>
          <span className="text-sm font-semibold">{entry.xp.toLocaleString()} XP</span>
        </div>
      ))}
    </div>
  );
}
