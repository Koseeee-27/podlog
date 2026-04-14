"use server";

import { createReviewRequestSchema } from "@/lib/schemas/review";
import { uuidSchema } from "@/lib/schemas/common";
import {
  createReview,
  updateMyReview,
  deleteMyReview,
} from "@/lib/data/reviews";
import { getViewer } from "@/lib/auth/getViewer";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { Review } from "@/types/review";

export interface ReviewFormState {
  success: boolean;
  error?: string;
  review?: Review;
}

export interface DeleteReviewState {
  success: boolean;
  error?: string;
}

/**
 * エピソードにレビューを新規投稿する Server Action。
 *
 * 認証チェックは `getViewer()` に統一している (PR A で導入した `cache()` の
 * リクエストスコープメモ化が効くため、同一リクエスト内で認証情報取得が
 * 重複しない)。DAL 側 (`createReview`) も認証ヘッダーを付けるため、実質的に
 * 二重防御となる。
 */
export async function createReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  const viewer = await getViewer();
  if (viewer.status !== "authenticated") {
    return { success: false, error: "ログインが必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = createReviewRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const review = await createReview(episodeId, {
      ...result.data,
      comment: result.data.comment || undefined,
    });
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "レビューの投稿に失敗しました"),
    };
  }
}

/**
 * 自分のエピソードレビューを更新する Server Action。
 */
export async function updateReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  const viewer = await getViewer();
  if (viewer.status !== "authenticated") {
    return { success: false, error: "ログインが必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = createReviewRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const review = await updateMyReview(episodeId, {
      ...result.data,
      comment: result.data.comment || undefined,
    });
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "レビューの更新に失敗しました"),
    };
  }
}

/**
 * 自分のエピソードレビューを削除する Server Action。
 */
export async function deleteReviewAction(
  episodeId: string,
): Promise<DeleteReviewState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  const viewer = await getViewer();
  if (viewer.status !== "authenticated") {
    return { success: false, error: "ログインが必要です" };
  }

  try {
    await deleteMyReview(episodeId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "レビューの削除に失敗しました"),
    };
  }
}
