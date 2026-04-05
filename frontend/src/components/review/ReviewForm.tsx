"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import type { ReviewFormState } from "@/lib/actions/review";
import { reviewFormInitialState } from "@/lib/actions/review";
import type { Review } from "@/types/review";

interface ReviewFormProps {
  action: (
    prevState: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>;
  initialRating?: number;
  initialComment?: string;
  submitLabel?: string;
  onSuccess?: (review: Review) => void;
}

export default function ReviewForm({
  action,
  initialRating = 0,
  initialComment = "",
  submitLabel = "投稿する",
  onSuccess,
}: ReviewFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    reviewFormInitialState,
  );
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [commentLength, setCommentLength] = useState(initialComment.length);
  const prevSuccessRef = useRef(false);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current && state.review) {
      onSuccess?.(state.review);
    }
    prevSuccessRef.current = state.success;
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
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

      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          コメント（任意）
        </label>
        <textarea
          id="comment"
          name="comment"
          defaultValue={initialComment}
          onChange={(e) => setCommentLength(e.target.value.length)}
          maxLength={1000}
          rows={3}
          placeholder="感想を書いてみましょう..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
        />
        <p className="mt-1 text-xs text-stone-400">{commentLength}/1000</p>
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
