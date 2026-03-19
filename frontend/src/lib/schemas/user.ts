import { z } from "zod";
import {
  uuidSchema,
  usernameSchema,
  displayNameSchema,
  datetimeSchema,
} from "./common";

/** User スキーマ（API レスポンス） */
export const userSchema = z.object({
  id: uuidSchema,
  username: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullish(),
  bio: z.string().nullish(),
  created_at: datetimeSchema,
  updated_at: datetimeSchema,
  is_admin: z.boolean().optional(),
});

export type User = z.infer<typeof userSchema>;

/** プロフィール作成リクエスト */
export const createProfileRequestSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
});

export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;

/** プロフィール更新リクエスト */
export const updateProfileRequestSchema = z.object({
  display_name: displayNameSchema.optional(),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

/** 公開プロフィール（API レスポンス） */
export const userPublicProfileSchema = z.object({
  id: uuidSchema,
  username: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullish(),
  bio: z.string().nullish(),
  created_at: datetimeSchema,
});

export type UserPublicProfile = z.infer<typeof userPublicProfileSchema>;

/** お気に入り番組アイテム */
export const favoritePodcastItemSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  artwork_url: z.string().optional(),
});

export type FavoritePodcastItem = z.infer<typeof favoritePodcastItemSchema>;

/** お気に入り番組リスト */
export const favoritePodcastListResultSchema = z.object({
  podcasts: z.array(favoritePodcastItemSchema),
});

export type FavoritePodcastListResult = z.infer<typeof favoritePodcastListResultSchema>;

/** アバターアップロード結果 */
export const avatarUploadResultSchema = z.object({
  avatar_url: z.string(),
});

export type AvatarUploadResult = z.infer<typeof avatarUploadResultSchema>;
