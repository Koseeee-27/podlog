"use client";

import { useState, useCallback, useTransition } from "react";
import TimelineCard from "@/components/timeline/TimelineCard";
import { fetchTimeline } from "@/lib/api/comments";
import type { TimelineItem } from "@/types/comment";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

interface TimelineLoadMoreProps {
  /** サーバーで取得済みの初回感想一覧（全件 state の初期値） */
  initialComments: TimelineItem[];
  /** サーバーで取得した感想総数（hasMore 判定の初期値に使う） */
  initialTotal: number;
}

/**
 * タイムラインの一覧表示 + 「もっと見る」用 Client Component。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で、`fetchOldTimeline`
 * （`{ reviews }` 形）を `fetchTimeline`（`{ comments }` 形、`lib/api/comments.ts`）に
 * 切替。アイテム型も `OldTimelineItem` → `TimelineItem` に変更。
 *
 * **初回分も含めて全件を 1 つの state で管理・描画する**（`CommentListLoader` /
 * `EpisodeCommentSectionClient` と同じパターン）。SC（`TimelineSection`）は初回取得と
 * セクション枠だけを担当し、一覧描画と追加読み込みは本コンポーネントに一元化している。
 * これにより:
 * - offset ベースのページ境界ずれ（投稿/削除で発生）で初回分と追加分に同じ id が
 *   返っても、`prev` ベースの id dedupe で二重表示を防げる
 * - `total` を state で持ち追加取得のたびに `data.total` で更新するため、総数が
 *   増減しても hasMore 判定が古くならない
 *
 * UI 上の振る舞いは旧実装を踏襲（`useTransition` で連打防止 / 失敗時は赤字メッセージ）。
 */
export default function TimelineLoadMore({
  initialComments,
  initialTotal,
}: TimelineLoadMoreProps) {
  const [comments, setComments] = useState<TimelineItem[]>(initialComments);
  const [total, setTotal] = useState(initialTotal);
  const [isLoadingMore, startLoadMore] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasMore = comments.length < total;

  const loadMore = useCallback(() => {
    startLoadMore(async () => {
      try {
        setError(null);
        const data = await fetchTimeline({
          limit: PAGE_SIZE,
          offset: comments.length,
        });
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const fresh = data.comments.filter((c) => !existingIds.has(c.id));
          return [...prev, ...fresh];
        });
        setTotal(data.total);
      } catch (err) {
        setError(
          getUserFriendlyErrorMessage(err, "追加読み込みに失敗しました")
        );
      }
    });
  }, [comments.length]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {comments.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>

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
