"use server";

import { createReviewRequestSchema } from "@/lib/schemas/review";
import { serverPost, serverPut } from "@/lib/api/server";
import type { Review } from "@/types/review";

export interface ReviewFormState {
  success: boolean;
  error?: string;
  review?: Review;
}

const initialState: ReviewFormState = { success: false };

export { initialState as reviewFormInitialState };

export async function createReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const raw = {
    rating: Number(formData.get("rating")),
    comment: (formData.get("comment") as string) || undefined,
  };

  const result = createReviewRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const review = await serverPost<Review>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews`,
      result.data,
    );
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "レビューの投稿に失敗しました",
    };
  }
}

export async function updateReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const raw = {
    rating: Number(formData.get("rating")),
    comment: (formData.get("comment") as string) || undefined,
  };

  const result = createReviewRequestSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const review = await serverPut<Review>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
      result.data,
    );
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "レビューの更新に失敗しました",
    };
  }
}
