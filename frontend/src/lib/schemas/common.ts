import { z } from "zod";
import { codePointLength } from "@/lib/utils";

/** UUID 形式のバリデーション */
export const uuidSchema = z.string().uuid("有効な UUID 形式ではありません");

/**
 * ユーザー名のバリデーション
 * - 3〜30文字
 * - 英数字とアンダースコアのみ
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "ユーザー名は3文字以上で入力してください")
  .max(30, "ユーザー名は30文字以内で入力してください")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "ユーザー名は英数字とアンダースコアのみ使用できます"
  );

/** 表示名のバリデーション */
export const displayNameSchema = z
  .string()
  .trim()
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
  .trim()
  .refine(
    (val) => {
      if (val === "") return true;
      try {
        const url = new URL(val);
        return /^https?:$/i.test(url.protocol);
      } catch {
        return false;
      }
    },
    "正しいURLを入力してください"
  );

/**
 * 星評価の **値そのもの** のバリデーション（1〜5 の整数）。
 *
 * `lib/schemas/rating.ts` の `ratingSchema`（API レスポンス全体型）と名前衝突
 * しないよう、値バリデータ部品は `ratingValueSchema` と命名している。
 * `createRatingRequestSchema` 等の `rating` フィールドの値検証部品として
 * 再利用する。
 */
export const ratingValueSchema = z
  .coerce.number()
  .int("評価は整数で入力してください")
  .min(1, "評価は1以上で入力してください")
  .max(5, "評価は5以下で入力してください");

/**
 * コメント / 感想本文の **値そのもの** のバリデーション（最大 1000 文字、trim 済み）。
 *
 * 旧 review モデルの「レビューコメント」と新 comment モデルの「感想本文」の
 * 両方で再利用できる汎用バリデータ部品。`schemas/comment.ts` の `commentSchema`
 * （API レスポンス全体型）と名前衝突しないよう、本体バリデータは
 * `commentBodySchema` と命名している（`ratingValueSchema` と同じ流儀）。
 *
 * **文字数定義は Unicode コードポイント数**:
 * BE（Go の `utf8.RuneCountInString` / PostgreSQL の `char_length`）と整合させる。
 * JS の標準 `.max(N)` は UTF-16 code unit 数基準のため、絵文字（サロゲート
 * ペア）を含む本文で BE と乖離する。`refine` で `Array.from(val).length` に
 * 揃える（utils.ts の `codePointLength()` 経由）。
 *
 * **最小値（必須/任意）の付与は呼び出し側の責務**:
 * - 必須にする場合: `requiredCommentBody("...")`（本ファイルで提供）
 * - 任意にする場合: `commentBodySchema.optional()`
 *
 * Zod の chain 制約により、`refine()` を含む schema（ZodEffects）には
 * `.min()` を直接 chain できない。そのため必須バージョンは `requiredCommentBody()`
 * ヘルパーで別途提供する。
 *
 * `commentBodySchema` 自体は最小値を持たないため、空文字も通過する。これは
 * review の `comment` フィールド（任意）と comment ドメインの `body`（必須）で
 * 同じ部品を再利用するためのトレードオフ。
 */
export const commentBodySchema = z
  .string()
  .trim()
  .refine((val) => codePointLength(val) <= 1000, {
    message: "コメントは1000文字以内で入力してください",
  });

/**
 * 必須のコメント本文（コードポイント数 1〜1000、trim 済み）。
 *
 * `commentBodySchema.min(1, ...)` の代替。Zod では refine() を含む schema
 * （ZodEffects）の上に `.min()` を chain できないため、min 含みの schema を
 * この関数で生成する。
 *
 * @param message `.min(1)` 違反時のエラーメッセージ（デフォルト: 「感想を入力してください」）
 *
 * @example
 * createCommentRequestSchema = z.object({
 *   body: requiredCommentBody("感想を入力してください"),
 * });
 */
export function requiredCommentBody(message = "感想を入力してください") {
  return z
    .string()
    .trim()
    .min(1, message)
    .refine((val) => codePointLength(val) <= 1000, {
      message: "コメントは1000文字以内で入力してください",
    });
}

/** ISO 8601 日時文字列 */
export const datetimeSchema = z.string();
