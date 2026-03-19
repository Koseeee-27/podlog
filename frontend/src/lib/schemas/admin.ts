import { z } from "zod";
import { uuidSchema } from "./common";

/** 番組登録フォームのバリデーション */
export const adminCreatePodcastSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  author: z.string().optional(),
  description: z.string().optional(),
  artwork_url: z.string().optional(),
  genre: z.string().optional(),
});

export type AdminCreatePodcastForm = z.infer<typeof adminCreatePodcastSchema>;

/** エピソード登録フォームのバリデーション */
export const adminCreateEpisodeSchema = z.object({
  podcast_id: uuidSchema,
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
  published_at: z.string().optional(),
});

export type AdminCreateEpisodeForm = z.infer<typeof adminCreateEpisodeSchema>;
