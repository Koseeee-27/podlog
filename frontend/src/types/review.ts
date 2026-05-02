export interface Review {
  id: string;
  user_id: string;
  episode_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  comment?: string;
}

export type MyReviewResult = Omit<Review, "user_id" | "episode_id">;

export interface ReviewUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface ReviewItem {
  id: string;
  user: ReviewUser;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface ReviewListResult {
  reviews: ReviewItem[];
  total: number;
  average_rating: number;
}

/**
 * 旧モデルの番組評価結果（`total_reviews` 形）。
 *
 * 過渡期メモ: 新モデルでは `types/rating.ts` の `PodcastRatingResult`
 * （`total_ratings` 形）を使う。両者を併存させるため、旧側を `Old` プレフィックス
 * 付きにリネーム退避している。P-9 で削除予定。
 */
export interface OldPodcastRatingResult {
  average_rating: number;
  total_reviews: number;
}

export interface ReviewEpisode {
  id: string;
  title: string;
  podcast_id: string;
  artwork_url?: string;
}

export interface ReviewPodcast {
  id: string;
  title: string;
  artwork_url?: string;
}

export interface UserReviewItem {
  id: string;
  episode: ReviewEpisode;
  podcast: ReviewPodcast;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface UserReviewListResult {
  reviews: UserReviewItem[];
  total: number;
}

export interface TimelineItem {
  id: string;
  user: ReviewUser;
  episode: ReviewEpisode;
  podcast: ReviewPodcast;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface TimelineResult {
  reviews: TimelineItem[];
  total: number;
}
