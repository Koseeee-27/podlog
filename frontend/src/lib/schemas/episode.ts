import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common";

/** Episode スキーマ（API レスポンス） */
export const episodeSchema = z.object({
  id: uuidSchema,
  podcast_id: uuidSchema,
  itunes_track_id: z.number().nullable(),
  guid: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  audio_url: z.string().nullable(),
  artwork_url: z.string().nullable(),
  source_url: z.string().nullable(),
  duration_ms: z.number().nullable(),
  published_at: z.string().nullable(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type Episode = z.infer<typeof episodeSchema>;

/** エピソード一覧アイテム */
export const episodeListItemSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  duration_ms: z.number().nullable(),
  published_at: z.string().nullable(),
  average_rating: z.number(),
  total_reviews: z.number(),
});

export type EpisodeListItem = z.infer<typeof episodeListItemSchema>;

/** エピソード一覧結果 */
export const episodeListResultSchema = z.object({
  episodes: z.array(episodeListItemSchema),
  total: z.number(),
});

export type EpisodeListResult = z.infer<typeof episodeListResultSchema>;
