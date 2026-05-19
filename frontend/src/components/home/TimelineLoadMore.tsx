"use client";

import { useState, useCallback, useTransition } from "react";
import TimelineCard from "@/components/timeline/TimelineCard";
import { fetchTimeline } from "@/lib/api/comments";
import type { TimelineItem } from "@/types/comment";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

interface TimelineLoadMoreProps {
  /** サーバーで取得済みの件数（追加読み込みの offset として使う） */
  initialCount: number;
  /** サーバーで取得した感想総数（hasMore 判定に使う） */
  total: number;
}

/**
 * タイムラインの「もっと見る」用 Client Component。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で、`fetchOldTimeline`
 * （`{ reviews }` 形）を `fetchTimeline`（`{ comments }` 形、`lib/api/comments.ts`）に
 * 切替。アイテム型も `OldTimelineItem` → `TimelineItem` に変更。
 *
 * UI 上の振る舞いは旧実装を踏襲（`useTransition` で連打防止 / 失敗時は赤字メッセージ）。
 */
export default function TimelineLoadMore({
  initialCount,
  total,
}: TimelineLoadMoreProps) {
  const [additionalComments, setAdditionalComments] = useState<TimelineItem[]>(
    []
  );
  const [isLoadingMore, startLoadMore] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadedCount = initialCount + additionalComments.length;
  const hasMore = loadedCount < total;

  const loadMore = useCallback(() => {
    startLoadMore(async () => {
      try {
        setError(null);
        const data = await fetchTimeline({
          limit: PAGE_SIZE,
          offset: loadedCount,
        });
        setAdditionalComments((prev) => [...prev, ...data.comments]);
      } catch (err) {
        setError(
          getUserFriendlyErrorMessage(err, "追加読み込みに失敗しました")
        );
      }
    });
  }, [loadedCount]);

  return (
    <>
      {additionalComments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {additionalComments.map((item) => (
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
