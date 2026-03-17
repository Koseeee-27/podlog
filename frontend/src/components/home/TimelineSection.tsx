"use client";

import { useTimeline } from "@/hooks/useReviews";
import TimelineCard from "@/components/timeline/TimelineCard";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function TimelineSection() {
  const { reviews, loading, error, hasMore, loadMore } = useTimeline();

  return (
    <section>
      <h2 className="text-lg font-bold text-stone-900 mb-4">みんなのレビュー</h2>

      {loading && reviews.length === 0 && <Loading />}
      {error && <ErrorMessage message={error} />}

      {!loading && reviews.length === 0 && !error && (
        <p className="text-sm text-stone-500">まだレビューはありません</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reviews.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && reviews.length > 0 && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </section>
  );
}
