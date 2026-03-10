"use client";

import type { ReviewItem } from "@/types/review";
import ReviewForm from "./ReviewForm";
import ReviewCard from "./ReviewCard";
import ErrorMessage from "@/components/ui/ErrorMessage";

export interface EpisodeReviewSectionViewProps {
  reviews: ReviewItem[];
  total: number;
  averageRating: number;
  listLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  actionLoading: boolean;
  actionError?: string | null;
  listError?: string | null;
  submitted: boolean;
}

export default function EpisodeReviewSectionView({
  reviews,
  total,
  averageRating,
  listLoading,
  hasMore,
  onLoadMore,
  onSubmit,
  actionLoading,
  actionError,
  listError,
  submitted,
}: EpisodeReviewSectionViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">レビュー</h2>
        {total > 0 && (
          <span className="text-sm text-gray-500">
            {averageRating.toFixed(1)} ({total}件)
          </span>
        )}
      </div>

      {!submitted && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">レビューを書く</h3>
          {actionError && <ErrorMessage message={actionError} />}
          <ReviewForm onSubmit={onSubmit} loading={actionLoading} />
        </div>
      )}

      {submitted && (
        <p className="text-sm text-green-600">レビューを投稿しました！</p>
      )}

      {listError && <ErrorMessage message={listError} />}

      {reviews.length === 0 && !listLoading ? (
        <p className="text-sm text-gray-500">まだレビューはありません</p>
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
          disabled={listLoading}
          className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {listLoading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
