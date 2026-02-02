import type { Reward } from '@/types';

export default function RewardCard({ reward }: { reward: Reward }) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
          reward.type === 'wld' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {reward.type === 'wld' ? '\ud83e\ude99' : '\u26a1'}
        </div>
        <div>
          <p className="text-sm font-medium">
            {reward.type === 'wld' ? `${reward.amount} WLD` : `${reward.amount} XP`}
          </p>
          <p className="text-xs text-gray-400">{reward.source.replace('_', ' ')}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${
        reward.claimed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
      }`}>
        {reward.claimed ? 'Claimed' : 'Pending'}
      </span>
    </div>
  );
}
