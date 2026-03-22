"use client";

import { useState, useCallback, useTransition } from "react";
import TimelineCard from "@/components/timeline/TimelineCard";
import { getTimeline } from "@/lib/api/reviews";
import type { TimelineItem } from "@/types/review";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

interface TimelineLoadMoreProps {
  /** サーバーで取得済みの件数（追加読み込みの offset として使う） */
  initialCount: number;
  /** サーバーで取得したレビュー総数 */
  total: number;
}

export default function TimelineLoadMore({
  initialCount,
  total,
}: TimelineLoadMoreProps) {
  const [additionalReviews, setAdditionalReviews] = useState<TimelineItem[]>(
    []
  );
  const [isLoadingMore, startLoadMore] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadedCount = initialCount + additionalReviews.length;
  const hasMore = loadedCount < total;

  const loadMore = useCallback(() => {
    startLoadMore(async () => {
      try {
        setError(null);
        const data = await getTimeline({
          limit: PAGE_SIZE,
          offset: loadedCount,
        });
        const list = data.reviews ?? [];
        setAdditionalReviews((prev) => [...prev, ...list]);
      } catch (err) {
        setError(
          getUserFriendlyErrorMessage(err)
        );
      }
    });
  }, [loadedCount]);

  return (
    <>
      {additionalReviews.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {additionalReviews.map((item) => (
            <TimelineCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={isLoadingMore}
          className="mt-6 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {isLoadingMore ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </>
  );
}
