"use client";

/**
 * 感想カードのリスト表示（presentational）。
 *
 * `EpisodeCommentItem[]` を並べ、`hasMore` が true なら「もっと見る」ボタンを
 * 表示する。実際のデータ取得・追加読み込みのロジックは親コンポーネント側に持たせる
 * （`useTransition` + `fetchEpisodeComments` のパターン想定）。
 *
 * `ReviewListView` の感想版だが、評価集計（average_rating）の表示は持たない
 * （感想は集計値の概念がなく、件数のみ表示する）。
 */

import type { EpisodeCommentItem } from "@/types/comment";
import CommentCard from "./CommentCard";

export interface CommentListProps {
  comments: EpisodeCommentItem[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function CommentList({
  comments,
  total,
  loading,
  hasMore,
  onLoadMore,
}: CommentListProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h2 className="text-lg font-semibold text-stone-900">感想</h2>
        {total > 0 && (
          <span className="text-sm text-stone-500">{total}件</span>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-stone-500">まだ感想はありません</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
        </div>
      )}

      {hasMore && comments.length > 0 && (
        <button
          type="button"
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
