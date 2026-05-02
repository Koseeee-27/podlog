/**
 * Rating ドメインの Zod schema（評価/感想分離後の新モデル）。
 *
 * 旧 `schemas/review.ts` から「評価（1〜5の星のみ）」を切り出した。
 *
 * 命名規約上の注意:
 * - `ratingSchema` は **API レスポンス全体型**（`Rating` の 6 フィールド）を表す。
 *   1〜5 の値バリデータ部品は `schemas/common.ts::ratingValueSchema` を別名で
 *   持っており、混同しないこと。
 * - `podcastRatingResultSchema` は新型（`total_ratings`）を返す。旧型
 *   （`total_reviews`）は `schemas/review.ts::oldPodcastRatingResultSchema`
 *   として退避済み。
 */
import { z } from "zod";
import { uuidSchema, datetimeSchema, ratingValueSchema } from "./common";

/**
 * 評価（Rating オブジェクト全体）。
 *
 * `POST /episodes/{id}/ratings` / `PUT /episodes/{id}/ratings/mine` /
 * `GET /episodes/{id}/ratings/mine` のレスポンス共通形式。
 */
export const ratingSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  episode_id: uuidSchema,
  rating: z.number().int().min(1).max(5),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type Rating = z.infer<typeof ratingSchema>;

/** 評価作成リクエスト（`POST /episodes/{id}/ratings`） */
export const createRatingRequestSchema = z.object({
  rating: ratingValueSchema,
});

export type CreateRatingRequest = z.infer<typeof createRatingRequestSchema>;

/** 評価更新リクエスト（`PUT /episodes/{id}/ratings/mine`） */
export const updateRatingRequestSchema = z.object({
  rating: ratingValueSchema,
});

export type UpdateRatingRequest = z.infer<typeof updateRatingRequestSchema>;

/**
 * 自分の評価レスポンス（`GET /episodes/{id}/ratings/mine`）。
 *
 * BE は `model.Rating` をそのまま返すため `ratingSchema` と同型。
 * 型の意図を明示するためエイリアスを切っている。
 */
export const myRatingResultSchema = ratingSchema;
export type MyRatingResult = z.infer<typeof myRatingResultSchema>;

/** 評価一覧に含まれるエピソード情報 */
export const ratingEpisodeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  podcast_id: uuidSchema,
  artwork_url: z.string().optional(),
});

export type RatingEpisode = z.infer<typeof ratingEpisodeSchema>;

/** 評価一覧に含まれる番組情報 */
export const ratingPodcastSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  artwork_url: z.string().optional(),
});

export type RatingPodcast = z.infer<typeof ratingPodcastSchema>;

/**
 * 自分の評価一覧の各レコード（`GET /users/me/ratings` のレスポンス内 `ratings[]`）。
 */
export const ratingItemSchema = z.object({
  id: uuidSchema,
  episode: ratingEpisodeSchema,
  podcast: ratingPodcastSchema,
  rating: z.number().int().min(1).max(5),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type RatingItem = z.infer<typeof ratingItemSchema>;

/** 自分の評価一覧結果（`GET /users/me/ratings`） */
export const ratingListResultSchema = z.object({
  ratings: z.array(ratingItemSchema),
  total: z.number(),
});

export type RatingListResult = z.infer<typeof ratingListResultSchema>;

/**
 * 星別の件数分布。BE の `map[int]int` を JSON エンコードしたものを表す。
 * キーは `"1"` 〜 `"5"` の文字列、値は件数。
 */
export const ratingDistributionSchema = z.record(z.string(), z.number());

export type RatingDistribution = z.infer<typeof ratingDistributionSchema>;

/**
 * エピソードの評価集計レスポンス（`GET /episodes/{id}/ratings`、公開）。
 */
export const episodeRatingResultSchema = z.object({
  average_rating: z.number(),
  total_ratings: z.number(),
  distribution: ratingDistributionSchema,
});

export type EpisodeRatingResult = z.infer<typeof episodeRatingResultSchema>;

/**
 * ユーザーの評価統計サマリー（`GET /users/{username}/ratings/stats`、公開）。
 */
export const userRatingsStatsResultSchema = z.object({
  total_ratings: z.number(),
  average_rating: z.number(),
  distribution: ratingDistributionSchema,
});

export type UserRatingsStatsResult = z.infer<typeof userRatingsStatsResultSchema>;

/**
 * 番組の平均評価（`GET /podcasts/{id}/rating`、公開）。
 *
 * 旧 `oldPodcastRatingResultSchema`（`total_reviews` 形）から `total_ratings`
 * 形に切り替えた新スキーマ。
 */
export const podcastRatingResultSchema = z.object({
  average_rating: z.number(),
  total_ratings: z.number(),
});

export type PodcastRatingResult = z.infer<typeof podcastRatingResultSchema>;
