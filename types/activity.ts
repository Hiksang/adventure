export interface Activity {
  id: string;
  title: string;
  description: string;
  type: 'code_entry' | 'knowledge_quiz';
  code: string | null;
  questions: QuizQuestion[] | null;
  xp_reward: number;
  wld_reward: number;
  is_active: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface ActivityCompletion {
  id: string;
  user_id: string;
  activity_id: string;
  completed: boolean;
  xp_earned: number;
  created_at: string;
}
