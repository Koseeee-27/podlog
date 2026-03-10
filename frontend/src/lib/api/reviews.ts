import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewListResult,
  PodcastRatingResult,
  UserReviewListResult,
  TimelineResult,
} from "@/types/review";

export function createReview(
  episodeId: string,
  data: CreateReviewRequest
): Promise<Review> {
  return apiPost<Review>(`/episodes/${encodeURIComponent(episodeId)}/reviews`, data);
}

export function updateReview(
  episodeId: string,
  data: UpdateReviewRequest
): Promise<Review> {
  return apiPut<Review>(`/episodes/${encodeURIComponent(episodeId)}/reviews/mine`, data);
}

export function deleteReview(episodeId: string): Promise<void> {
  return apiDelete(`/episodes/${encodeURIComponent(episodeId)}/reviews/mine`);
}

export function getEpisodeReviews(
  episodeId: string,
  params?: { limit?: number; offset?: number }
): Promise<ReviewListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<ReviewListResult>(
    `/episodes/${encodeURIComponent(episodeId)}/reviews${query ? `?${query}` : ""}`
  );
}

export function getPodcastRating(podcastId: string): Promise<PodcastRatingResult> {
  return apiGet<PodcastRatingResult>(`/podcasts/${encodeURIComponent(podcastId)}/rating`);
}

export function getMyReviews(
  params?: { limit?: number; offset?: number }
): Promise<UserReviewListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<UserReviewListResult>(
    `/users/me/reviews${query ? `?${query}` : ""}`
  );
}

export function getTimeline(
  params?: { limit?: number; offset?: number }
): Promise<TimelineResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<TimelineResult>(`/timeline${query ? `?${query}` : ""}`);
}
