export interface Reward {
  id: string;
  user_id: string;
  type: 'xp' | 'wld';
  amount: number;
  source: 'ad_view' | 'activity_completion';
  source_id: string;
  claimed: boolean;
  tx_hash: string | null;
  created_at: string;
}

export interface RewardSummary {
  total_xp: number;
  total_wld_earned: number;
  total_wld_claimed: number;
  pending_wld: number;
  level: number;
  ads_watched: number;
  activities_completed: number;
}
