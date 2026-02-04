export interface User {
  id: string;
  wallet_address: string | null;
  username: string;
  world_id_verified: boolean;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
  // World ID fields
  nullifier_hash?: string;
  verification_level?: 'orb' | 'device';
  world_id_verified_at?: string;
}

export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
}

export interface XPHistory {
  id: string;
  user_id: string;
  amount: number;
  source: 'ad_view' | 'activity_completion' | 'quiz_completion';
  source_id: string;
  created_at: string;
}
