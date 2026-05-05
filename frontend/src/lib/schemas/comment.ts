/**
 * Comment ドメインの Zod schema（評価/感想分離後の新モデル）。
 *
 * 旧 `schemas/review.ts` から「感想（自由記述、X 風短文〜1000 字）」を切り出した。
 *
 * 命名規約上の注意:
 * - `commentSchema` は **API レスポンス全体型**（Comment の 6 フィールド）を表す。
 *   感想本文の値バリデータ部品は `schemas/common.ts::commentBodySchema` を別名で
 *   持っており、混同しないこと。
 * - 旧 `schemas/review.ts` の `timelineResultSchema` 等は P-9 で削除予定の
 *   `oldTimelineResultSchema` に退避済み。
 *
 * BE は `display_name` / `avatar_url` / `artwork_url` を `omitempty` + ポインタ型で
 * 返すため、Zod 側は `.optional()` で対応する。
 */
import { z } from "zod";
import { uuidSchema, datetimeSchema, commentBodySchema } from "./common";

/**
 * 感想（Comment オブジェクト全体）。
 *
 * `POST /episodes/{id}/comments` / `PUT /comments/{id}` のレスポンス共通形式。
 */
export const commentSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  episode_id: uuidSchema,
  body: z.string(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type Comment = z.infer<typeof commentSchema>;

/** 感想作成リクエスト（`POST /episodes/{id}/comments`） */
export const createCommentRequestSchema = z.object({
  body: commentBodySchema.min(1, "感想を入力してください"),
});

export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;

/** 感想更新リクエスト（`PUT /comments/{id}`） */
export const updateCommentRequestSchema = z.object({
  body: commentBodySchema.min(1, "感想を入力してください"),
});

export type UpdateCommentRequest = z.infer<typeof updateCommentRequestSchema>;

/** 感想に紐づくユーザー情報（公開項目のみ） */
export const commentUserSchema = z.object({
  id: uuidSchema,
  username: z.string(),
  display_name: z.string().optional(),
  avatar_url: z.string().optional(),
});

export type CommentUser = z.infer<typeof commentUserSchema>;

/** 感想一覧に含まれるエピソード情報 */
export const commentEpisodeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  podcast_id: uuidSchema,
  artwork_url: z.string().optional(),
});

export type CommentEpisode = z.infer<typeof commentEpisodeSchema>;

/** 感想一覧に含まれる番組情報 */
export const commentPodcastSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  artwork_url: z.string().optional(),
});

export type CommentPodcast = z.infer<typeof commentPodcastSchema>;

/**
 * エピソード感想一覧の各行（`GET /episodes/{id}/comments` のレスポンス内 `comments[]`）。
 */
export const commentItemSchema = z.object({
  id: uuidSchema,
  user: commentUserSchema,
  body: z.string(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type CommentItem = z.infer<typeof commentItemSchema>;

/** エピソード感想一覧結果（`GET /episodes/{id}/comments`） */
export const commentListResultSchema = z.object({
  comments: z.array(commentItemSchema),
  total: z.number(),
});

export type CommentListResult = z.infer<typeof commentListResultSchema>;

/**
 * ユーザー感想一覧の各行（`GET /users/me/comments` /
 * `GET /users/{username}/comments` のレスポンス内 `comments[]`）。
 */
export const userCommentItemSchema = z.object({
  id: uuidSchema,
  episode: commentEpisodeSchema,
  podcast: commentPodcastSchema,
  body: z.string(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type UserCommentItem = z.infer<typeof userCommentItemSchema>;

/** ユーザー感想一覧結果 */
export const userCommentListResultSchema = z.object({
  comments: z.array(userCommentItemSchema),
  total: z.number(),
});

export type UserCommentListResult = z.infer<typeof userCommentListResultSchema>;

/**
 * タイムラインの各行（`GET /timeline` のレスポンス内 `comments[]`）。
 * `user` + `episode` + `podcast` をすべて含む。
 */
export const timelineItemSchema = z.object({
  id: uuidSchema,
  user: commentUserSchema,
  episode: commentEpisodeSchema,
  podcast: commentPodcastSchema,
  body: z.string(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type TimelineItem = z.infer<typeof timelineItemSchema>;

/** タイムライン結果（`GET /timeline`、新 comment ベース） */
export const timelineResultSchema = z.object({
  comments: z.array(timelineItemSchema),
  total: z.number(),
});

export type TimelineResult = z.infer<typeof timelineResultSchema>;
