export interface Ad {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'video';
  content_url: string | null;
  content_text: string | null;
  thumbnail_url: string | null;
  xp_reward: number;
  wld_reward: number;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
}

export interface AdView {
  id: string;
  user_id: string;
  ad_id: string;
  completed: boolean;
  watch_percentage: number;
  xp_earned: number;
  created_at: string;
}
