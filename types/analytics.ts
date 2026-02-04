export interface Streak {
  current: number;
  max: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
}

export interface DailyGoal {
  ads: { current: number; target: number };
  activities: { current: number; target: number };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  xp: number;
  level: number;
}
