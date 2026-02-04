'use client';
import type { Streak } from '@/types';

export default function StreakCounter({ streak }: { streak: Streak }) {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 flex items-center gap-3">
      <span className="text-3xl">🔥</span>
      <div>
        <p className="font-bold text-lg">{streak.current} day streak</p>
        <p className="text-sm text-gray-500">Best: {streak.max} days · Keep it up!</p>
      </div>
    </div>
  );
}
