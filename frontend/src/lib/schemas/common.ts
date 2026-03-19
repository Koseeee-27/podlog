import { z } from "zod";

/** UUID 形式のバリデーション */
export const uuidSchema = z.string().uuid("有効な UUID 形式ではありません");

/**
 * ユーザー名のバリデーション
 * - 3〜30文字
 * - 英数字とアンダースコアのみ
 */
export const usernameSchema = z
  .string()
  .min(3, "ユーザー名は3文字以上で入力してください")
  .max(30, "ユーザー名は30文字以内で入力してください")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "ユーザー名は英数字とアンダースコアのみ使用できます"
  );

/** 表示名のバリデーション */
export const displayNameSchema = z
  .string()
  .min(1, "表示名は必須です")
  .max(50, "表示名は50文字以内で入力してください");

/** URL 形式のバリデーション（http / https のみ許可） */
export const httpUrlSchema = z
  .string()
  .url("正しいURLを入力してください")
  .refine(
    (val) => /^https?:\/\//i.test(val),
    "URL は http:// または https:// で始まる必要があります"
  );

/** 任意の URL（空文字許容） */
export const optionalHttpUrlSchema = z
  .string()
  .refine(
    (val) => {
      const trimmed = val.trim();
      if (trimmed === "") return true;
      try {
        const url = new URL(trimmed);
        return /^https?:$/i.test(url.protocol);
      } catch {
        return false;
      }
    },
    "正しいURLを入力してください"
  );

/** 星評価（1〜5 の整数） */
export const ratingSchema = z
  .number()
  .int("評価は整数で入力してください")
  .min(1, "評価は1以上で入力してください")
  .max(5, "評価は5以下で入力してください");

/** レビューコメント（任意、最大 1000 文字） */
export const commentSchema = z
  .string()
  .max(1000, "コメントは1000文字以内で入力してください");

/** ISO 8601 日時文字列 */
export const datetimeSchema = z.string();
