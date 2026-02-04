export type FeedItemType = 'content' | 'ad' | 'quiz';
export type ContentType = 'video' | 'image' | 'text';

export interface ContentData {
  type: ContentType;
  url?: string;
  text?: string;
  creator: string;
  description: string;
  likes?: number;
  comments?: number;
}

export interface AdData {
  id: string;
  title: string;
  brand: string;
  type: ContentType;
  url?: string;
  text?: string;
  xp_reward: number;
  duration_seconds: number;
}

export interface QuizData {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  xp_reward: number;
  related_ad_id?: string;
}

export interface FeedItem {
  id: string;
  type: FeedItemType;
  content?: ContentData;
  ad?: AdData;
  quiz?: QuizData;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor?: string;
  hasMore: boolean;
}
