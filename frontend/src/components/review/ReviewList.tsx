"use client";

import { useEpisodeReviews } from "@/hooks/useReviews";
import ReviewCard from "./ReviewCard";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface ReviewListProps {
  episodeId: string;
}

export default function ReviewList({ episodeId }: ReviewListProps) {
  const { reviews, total, averageRating, loading, error, hasMore, loadMore } =
    useEpisodeReviews(episodeId);

  if (loading && reviews.length === 0) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">レビュー</h2>
        {total > 0 && (
          <span className="text-sm text-gray-500">
            {averageRating.toFixed(1)} ({total}件)
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
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
          disabled={loading}
          className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
