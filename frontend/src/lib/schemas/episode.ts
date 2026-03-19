import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common";

/** Episode スキーマ（API レスポンス） */
export const episodeSchema = z.object({
  id: uuidSchema,
  podcast_id: uuidSchema,
  itunes_track_id: z.number().nullish(),
  guid: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  audio_url: z.string().nullish(),
  artwork_url: z.string().nullish(),
  source_url: z.string().nullish(),
  duration_ms: z.number().nullish(),
  published_at: z.string().nullish(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type Episode = z.infer<typeof episodeSchema>;

/** エピソード一覧アイテム */
export const episodeListItemSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullish(),
  duration_ms: z.number().nullish(),
  published_at: z.string().nullish(),
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
