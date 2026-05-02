"use server";

/**
 * Rating ドメインの Server Actions（mutation 専用）。
 *
 * 評価/感想分離（podlog-workspace#59）の FE 層対応で追加。旧
 * `lib/actions/review.ts` から評価レイヤーのみを切り出した形。
 *
 * 認証チェックは `getViewer()` に統一している（cache() のリクエストスコープ
 * メモ化が効くため、同一リクエスト内で認証情報取得が重複しない）。DAL 側
 * （`createRating` 等）も認証ヘッダーを付けるため、実質的に二重防御となる。
 *
 * フォーム連携は `useActionState` 互換のシグネチャ
 * `(episodeId, prevState, formData)` で揃える。`useActionState` から渡される
 * `formData` は `FormData` 型なので `Object.fromEntries` でフラット化してから
 * Zod に渡す。
 */

import {
  createRatingRequestSchema,
  updateRatingRequestSchema,
} from "@/lib/schemas/rating";
import { uuidSchema } from "@/lib/schemas/common";
import {
  createRating,
  updateMyRating,
  deleteMyRating,
} from "@/lib/data/ratings";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { Rating } from "@/types/rating";

export interface RatingFormState {
  success: boolean;
  error?: string;
  /**
   * 投稿/更新成功時の Rating レコード。
   *
   * 本 PR (P-5) ではこの値を消費する UI は無い。P-6 で UI 側が
   * `useActionState` の戻り値から `state.rating` を読み、楽観的更新の
   * 確定値として使う想定で先行定義している（既存 `ReviewFormState.review`
   * と同じパターン）。
   */
  rating?: Rating;
}

export interface DeleteRatingState {
  success: boolean;
  error?: string;
}

/**
 * エピソードに評価を新規投稿する Server Action。
 *
 * BE が 409 を返した場合の `PUT` フォールバックは UI 側（P-6）の責務とする。
 * 本 Action は単純に POST のみを叩き、エラーはそのまま返す。
 */
export async function createRatingAction(
  episodeId: string,
  _prevState: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    return { success: false, error: "認証情報の取得に失敗しました" };
  }
  if (viewer.status === "guest") {
    return { success: false, error: "ログインが必要です" };
  }
  if (viewer.status !== "authenticated") {
    return { success: false, error: "プロフィール設定が必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = createRatingRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const rating = await createRating(episodeId, result.data);
    return { success: true, rating };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "評価の投稿に失敗しました"),
    };
  }
}

/**
 * 自分のエピソード評価を更新する Server Action。
 */
export async function updateRatingAction(
  episodeId: string,
  _prevState: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    return { success: false, error: "認証情報の取得に失敗しました" };
  }
  if (viewer.status === "guest") {
    return { success: false, error: "ログインが必要です" };
  }
  if (viewer.status !== "authenticated") {
    return { success: false, error: "プロフィール設定が必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = updateRatingRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const rating = await updateMyRating(episodeId, result.data);
    return { success: true, rating };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "評価の更新に失敗しました"),
    };
  }
}

/**
 * 自分のエピソード評価を削除する Server Action。
 */
export async function deleteRatingAction(
  episodeId: string,
): Promise<DeleteRatingState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    return { success: false, error: "認証情報の取得に失敗しました" };
  }
  if (viewer.status === "guest") {
    return { success: false, error: "ログインが必要です" };
  }
  if (viewer.status !== "authenticated") {
    return { success: false, error: "プロフィール設定が必要です" };
  }

  try {
    await deleteMyRating(episodeId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "評価の削除に失敗しました"),
    };
  }
}
