"use server";

import { createReviewRequestSchema } from "@/lib/schemas/review";
import { uuidSchema } from "@/lib/schemas/common";
import { serverPost, serverPut } from "@/lib/api/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types/review";

export interface ReviewFormState {
  success: boolean;
  error?: string;
  review?: Review;
}

export async function createReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = createReviewRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const review = await serverPost<Review>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews`,
      { ...result.data, comment: result.data.comment || undefined },
    );
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "レビューの投稿に失敗しました"),
    };
  }
}

export async function updateReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = createReviewRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const review = await serverPut<Review>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
      { ...result.data, comment: result.data.comment || undefined },
    );
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "レビューの更新に失敗しました"),
    };
  }
}
