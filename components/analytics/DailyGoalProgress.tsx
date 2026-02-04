'use client';
import type { DailyGoal } from '@/types';

export default function DailyGoalProgress({ goal }: { goal: DailyGoal }) {
  const adsPercent = Math.min(100, (goal.ads.current / goal.ads.target) * 100);
  const activitiesPercent = Math.min(100, (goal.activities.current / goal.activities.target) * 100);
  const totalDone = goal.ads.current + goal.activities.current;
  const totalTarget = goal.ads.target + goal.activities.target;

  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <p className="font-semibold">Daily Goal</p>
        <span className="text-sm text-gray-500">{totalDone}/{totalTarget}</span>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Ads {goal.ads.current}/{goal.ads.target}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${adsPercent}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Activities {goal.activities.current}/{goal.activities.target}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${activitiesPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
