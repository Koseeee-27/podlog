"use client";

import { useActionState, useState } from "react";
import type { RatingFormState } from "@/lib/actions/rating";
import type { Rating } from "@/types/rating";

interface RatingFormProps {
  /**
   * `useActionState` 互換の Server Action。
   * `createRatingAction.bind(null, episodeId)` / `updateRatingAction.bind(null, episodeId)`
   * のように `episodeId` を bind してから渡す想定。
   */
  action: (
    prevState: RatingFormState,
    formData: FormData,
  ) => Promise<RatingFormState>;
  /** 編集モード時に既存の評価値を初期値として渡す */
  initialRating?: number;
  /** 投稿ボタンの文言。新規投稿は「投稿する」、編集モードは「更新する」 */
  submitLabel?: string;
  /** 投稿/更新成功時のコールバック。親側で楽観的更新と一覧再取得を行う */
  onSuccess?: (rating: Rating) => void;
}

/**
 * 星評価のみのフォーム（`comment` フィールドなし）。
 *
 * 旧 `components/review/ReviewForm.tsx` から `comment` textarea を取り除き、
 * 評価値（1〜5）のみを送信する形に縮約したコンポーネント。`useActionState` +
 * Server Action（`createRatingAction` / `updateRatingAction`）の組み合わせで
 * フォーム送信を扱う。
 *
 * 評価値は hidden input `name="rating"` として送信され、Server Action 側で
 * `createRatingRequestSchema` / `updateRatingRequestSchema` がパースする。
 */
export default function RatingForm({
  action,
  initialRating = 0,
  submitLabel = "投稿する",
  onSuccess,
}: RatingFormProps) {
  async function wrappedAction(prevState: RatingFormState, formData: FormData) {
    const result = await action(prevState, formData);
    if (result.success && result.rating) {
      onSuccess?.(result.rating);
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState<RatingFormState, FormData>(
    wrappedAction,
    { success: false },
  );
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="rating" value={rating} />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          評価
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              aria-label={`${star}つ星`}
              aria-pressed={rating === star}
              className="text-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:rounded"
            >
              <span
                className={
                  star <= (hoveredRating || rating)
                    ? "text-yellow-400"
                    : "text-stone-300"
                }
              >
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={rating === 0 || isPending}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
          rating === 0 || isPending
            ? "bg-stone-300 cursor-not-allowed"
            : "bg-rose-500 hover:bg-rose-600"
        }`}
      >
        {isPending ? "送信中..." : submitLabel}
      </button>
    </form>
  );
}
