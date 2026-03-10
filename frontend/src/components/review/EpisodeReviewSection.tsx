"use client";

import { useState } from "react";
import { useReviewActions, useEpisodeReviews } from "@/hooks/useReviews";
import ReviewForm from "./ReviewForm";
import ReviewCard from "./ReviewCard";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface EpisodeReviewSectionProps {
  episodeId: string;
}

export default function EpisodeReviewSection({ episodeId }: EpisodeReviewSectionProps) {
  const { reviews, total, averageRating, loading: listLoading, error: listError, hasMore, loadMore, refresh } =
    useEpisodeReviews(episodeId);
  const { create, loading: actionLoading, error: actionError } = useReviewActions(episodeId);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (rating: number, comment: string) => {
    const review = await create({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      setSubmitted(true);
      refresh();
    }
  };

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
          <ReviewForm onSubmit={handleSubmit} loading={actionLoading} />
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
          onClick={loadMore}
          disabled={listLoading}
          className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {listLoading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
