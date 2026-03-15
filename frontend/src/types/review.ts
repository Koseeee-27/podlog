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

export interface MyReviewResult {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

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

export interface PodcastRatingResult {
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
