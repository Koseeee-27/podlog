import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common";

/** Podcast スキーマ（API レスポンス） */
export const podcastSchema = z.object({
  id: uuidSchema,
  itunes_id: z.number().nullable(),
  title: z.string(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  feed_url: z.string().nullable(),
  artwork_url: z.string().nullable(),
  itunes_url: z.string().nullable(),
  genre: z.string().nullable(),
  source_type: z.enum(["itunes", "radiko", "manual"]),
  source_url: z.string().nullable(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
});

export type Podcast = z.infer<typeof podcastSchema>;

/** 検索結果の番組アイテム */
export const podcastSearchItemSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  author: z.string().nullable(),
  artwork_url: z.string().nullable(),
  average_rating: z.number(),
  total_reviews: z.number(),
});

export type PodcastSearchItem = z.infer<typeof podcastSearchItemSchema>;

/** 番組検索結果 */
export const podcastSearchResultSchema = z.object({
  podcasts: z.array(podcastSearchItemSchema),
  total: z.number(),
});

export type PodcastSearchResult = z.infer<typeof podcastSearchResultSchema>;
