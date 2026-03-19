"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { createReviewRequestSchema } from "@/lib/schemas/review";

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  initialRating?: number;
  initialComment?: string;
  submitLabel?: string;
  loading?: boolean;
}

export default function ReviewForm({
  onSubmit,
  initialRating = 0,
  initialComment = "",
  submitLabel = "投稿する",
  loading = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const result = createReviewRequestSchema.safeParse({
      rating,
      comment: comment || undefined,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0].message);
      return;
    }

    await onSubmit(result.data.rating, result.data.comment ?? "");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">評価</label>
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
              <span className={
                star <= (hoveredRating || rating)
                  ? "text-yellow-400"
                  : "text-stone-300"
              }>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-stone-700 mb-1">
          コメント（任意）
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="感想を書いてみましょう..."
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
        />
        <p className="mt-1 text-xs text-stone-400">{comment.length}/1000</p>
      </div>

      {validationError && (
        <p className="text-sm text-red-600">{validationError}</p>
      )}

      <button
        type="submit"
        disabled={rating === 0 || loading}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
          rating === 0 || loading
            ? "bg-stone-300 cursor-not-allowed"
            : "bg-rose-500 hover:bg-rose-600"
        }`}
      >
        {loading ? "送信中..." : submitLabel}
      </button>
    </form>
  );
}
