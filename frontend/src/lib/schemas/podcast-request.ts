import { z } from "zod";
import { optionalHttpUrlSchema } from "./common";

/** 番組追加リクエストのフォームバリデーション */
export const podcastRequestFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "番組名を入力してください")
    .max(500, "番組名は500文字以内で入力してください"),
  url: optionalHttpUrlSchema.optional().default(""),
});

export type PodcastRequestFormData = z.infer<typeof podcastRequestFormSchema>;
