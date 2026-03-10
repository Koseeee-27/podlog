"use client";

import { useTimeline } from "@/hooks/useReviews";
import TimelineCard from "@/components/timeline/TimelineCard";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function TimelinePageClient() {
  const { reviews, total, loading, error, hasMore, loadMore } = useTimeline();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">タイムライン</h1>
        {total > 0 && (
          <p className="mt-1 text-sm text-gray-500">{total}件のレビュー</p>
        )}
      </div>

      {loading && reviews.length === 0 && <Loading />}
      {error && <ErrorMessage message={error} />}

      {!loading && reviews.length === 0 && !error && (
        <p className="text-sm text-gray-500">まだレビューはありません</p>
      )}

      <div className="space-y-4">
        {reviews.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && reviews.length > 0 && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
