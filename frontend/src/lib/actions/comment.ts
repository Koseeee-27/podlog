"use server";

/**
 * Comment ドメインの Server Actions（mutation 専用）。
 *
 * 評価/感想分離（podlog-workspace#59）の FE 層対応で追加。旧
 * `lib/actions/review.ts` から「感想本文」レイヤーを切り出した形。
 *
 * 認証チェックは `getViewer()` に統一している（cache() のリクエストスコープ
 * メモ化が効くため、同一リクエスト内で認証情報取得が重複しない）。DAL 側
 * （`createComment` 等）も認証ヘッダーを付けるため、実質的に二重防御となる。
 *
 * フォーム連携の関数シグネチャ:
 * - 新規投稿: `createCommentAction(episodeId, prevState, formData)`
 *   `useActionState` から渡される `formData` を `Object.fromEntries` で
 *   フラット化してから Zod に渡す。
 * - 更新:    `updateCommentAction(commentId, prevState, formData)`
 *   PUT は **commentId** をパスに含むため、第一引数も commentId（episodeId ではない）。
 *   rating の `updateRatingAction(episodeId, ...)` とは異なるので注意。
 * - 削除:    `deleteCommentAction(commentId)`
 *   formData を取らない。確認 UI 経由で commentId のみを受け取る。
 *
 * 403 / 404 の扱い:
 * - BE は他人の感想を更新・削除しようとすると 403、リソース不存在は 404 を返す。
 * - DAL 側で個別ハンドリングせず、`apiFetch` が `ApiRequestError` で `status` を
 *   伝搬する。本 Action では `getUserFriendlyErrorMessage` でメッセージに変換する
 *   のみで、UI 層がフォーム上で表示する（`frontend.md`「ドメイン固有エラーは
 *   UI 層で扱う」規約）。
 */

import {
  createCommentRequestSchema,
  updateCommentRequestSchema,
} from "@/lib/schemas/comment";
import { uuidSchema } from "@/lib/schemas/common";
import {
  createComment,
  updateMyComment,
  deleteMyComment,
} from "@/lib/data/comments";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { Comment } from "@/types/comment";

export interface CommentFormState {
  success: boolean;
  error?: string;
  /**
   * 投稿 / 更新成功時の Comment レコード。
   *
   * UI 層（CommentForm）が `useActionState` の戻り値から `state.comment` を読み、
   * 連投時の textarea クリア判定や楽観的更新の確定値として使う想定。
   */
  comment?: Comment;
}

export interface DeleteCommentState {
  success: boolean;
  error?: string;
}

/**
 * 認証チェックの共通処理。`Viewer` が `authenticated`（プロフィール設定済み）
 * でなければエラー文言付きで早期 return するため、各 Action の冒頭で同じ
 * パターンを書かずに済むよう括り出している。
 *
 * 戻り値:
 * - `{ ok: true, viewer }` — 認証 OK（プロフィール設定済み）
 * - `{ ok: false, error }` — 認証エラー（UI に返すメッセージ付き）
 */
async function ensureAuthenticated(): Promise<
  { ok: true; viewer: Viewer } | { ok: false; error: string }
> {
  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    return { ok: false, error: "認証情報の取得に失敗しました" };
  }
  if (viewer.status === "guest") {
    return { ok: false, error: "ログインが必要です" };
  }
  if (viewer.status !== "authenticated") {
    return { ok: false, error: "プロフィール設定が必要です" };
  }
  return { ok: true, viewer };
}

/**
 * エピソードに感想を新規投稿する Server Action。
 *
 * BE 側は 1ユーザー1エピソード=複数件投稿可能（rating と異なり 409 はない）の
 * ため、フォールバックロジックは不要。
 */
export async function createCommentAction(
  episodeId: string,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  const auth = await ensureAuthenticated();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const raw = Object.fromEntries(formData);

  const result = createCommentRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const comment = await createComment(episodeId, result.data);
    return { success: true, comment };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "感想の投稿に失敗しました"),
    };
  }
}

/**
 * 自分の感想を更新する Server Action。
 *
 * 第一引数は **commentId**（episodeId ではない）。`PUT /comments/:id` に対応。
 * 他人の感想を更新しようとすると BE が 403 を返し、`getUserFriendlyErrorMessage`
 * で適切なメッセージに変換される。
 */
export async function updateCommentAction(
  commentId: string,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  if (!uuidSchema.safeParse(commentId).success) {
    return { success: false, error: "無効なコメントIDです" };
  }

  const auth = await ensureAuthenticated();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const raw = Object.fromEntries(formData);

  const result = updateCommentRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const comment = await updateMyComment(commentId, result.data);
    return { success: true, comment };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "感想の更新に失敗しました"),
    };
  }
}

/**
 * 自分の感想を削除する Server Action。
 *
 * 第一引数は **commentId**（episodeId ではない）。`DELETE /comments/:id` に対応。
 * BE は 204 No Content を返す。
 */
export async function deleteCommentAction(
  commentId: string,
): Promise<DeleteCommentState> {
  if (!uuidSchema.safeParse(commentId).success) {
    return { success: false, error: "無効なコメントIDです" };
  }

  const auth = await ensureAuthenticated();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await deleteMyComment(commentId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "感想の削除に失敗しました"),
    };
  }
}
