import { z } from "zod";
import { uuidSchema, datetimeSchema, ratingSchema, commentSchema } from "./common";

/** レビュー投稿者 */
export const reviewUserSchema = z.object({
  id: uuidSchema,
  username: z.string(),
  display_name: z.string(),
  avatar_url: z.string().optional(),
});

export type ReviewUser = z.infer<typeof reviewUserSchema>;

/** レビュー（API レスポンス） */
export const reviewSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  episode_id: uuidSchema,
  rating: z.number(),
  comment: z.string().optional(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type Review = z.infer<typeof reviewSchema>;

/** レビュー作成リクエスト */
export const createReviewRequestSchema = z.object({
  rating: ratingSchema,
  comment: commentSchema.optional(),
});

export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>;

/** レビュー更新リクエスト */
export const updateReviewRequestSchema = z.object({
  rating: ratingSchema,
  comment: commentSchema.optional(),
});

export type UpdateReviewRequest = z.infer<typeof updateReviewRequestSchema>;

/** レビューアイテム（一覧用） */
export const reviewItemSchema = z.object({
  id: uuidSchema,
  user: reviewUserSchema,
  rating: z.number(),
  comment: z.string().optional(),
  created_at: datetimeSchema,
});

export type ReviewItem = z.infer<typeof reviewItemSchema>;

/** レビュー一覧結果 */
export const reviewListResultSchema = z.object({
  reviews: z.array(reviewItemSchema),
  total: z.number(),
  average_rating: z.number(),
});

export type ReviewListResult = z.infer<typeof reviewListResultSchema>;

/** 番組評価結果 */
export const podcastRatingResultSchema = z.object({
  average_rating: z.number(),
  total_reviews: z.number(),
});

export type PodcastRatingResult = z.infer<typeof podcastRatingResultSchema>;

/** レビューに含まれるエピソード情報 */
export const reviewEpisodeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  podcast_id: uuidSchema,
  artwork_url: z.string().optional(),
});

export type ReviewEpisode = z.infer<typeof reviewEpisodeSchema>;

/** レビューに含まれる番組情報 */
export const reviewPodcastSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  artwork_url: z.string().optional(),
});

export type ReviewPodcast = z.infer<typeof reviewPodcastSchema>;

/** ユーザーのレビューアイテム */
export const userReviewItemSchema = z.object({
  id: uuidSchema,
  episode: reviewEpisodeSchema,
  podcast: reviewPodcastSchema,
  rating: z.number(),
  comment: z.string().optional(),
  created_at: datetimeSchema,
});

export type UserReviewItem = z.infer<typeof userReviewItemSchema>;

/** ユーザーのレビュー一覧結果 */
export const userReviewListResultSchema = z.object({
  reviews: z.array(userReviewItemSchema),
  total: z.number(),
});

export type UserReviewListResult = z.infer<typeof userReviewListResultSchema>;

/** タイムラインアイテム */
export const timelineItemSchema = z.object({
  id: uuidSchema,
  user: reviewUserSchema,
  episode: reviewEpisodeSchema,
  podcast: reviewPodcastSchema,
  rating: z.number(),
  comment: z.string().optional(),
  created_at: datetimeSchema,
});

export type TimelineItem = z.infer<typeof timelineItemSchema>;

/** タイムライン結果 */
export const timelineResultSchema = z.object({
  reviews: z.array(timelineItemSchema),
  total: z.number(),
});

export type TimelineResult = z.infer<typeof timelineResultSchema>;
