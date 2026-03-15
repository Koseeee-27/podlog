"use client";

import type { ReviewItem } from "@/types/review";
import ReviewCard from "./ReviewCard";

export interface ReviewListViewProps {
  reviews: ReviewItem[];
  total: number;
  averageRating: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function ReviewListView({
  reviews,
  total,
  averageRating,
  loading,
  hasMore,
  onLoadMore,
}: ReviewListViewProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h2 className="text-lg font-semibold text-stone-900">レビュー</h2>
        {total > 0 && (
          <span className="text-sm text-stone-500">
            {averageRating.toFixed(1)} ({total}件)
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-stone-500">まだレビューはありません</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {hasMore && reviews.length > 0 && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="mt-4 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
