/**
 * 自分の感想カード（編集・削除メニュー付き）。
 *
 * `MyReviewCard` の感想版。表示と編集・削除の状態管理は親コンポーネント側に持たせ、
 * 本コンポーネントは presentational に徹する（`onEdit` / `onStartDelete` /
 * `onConfirmDelete` 等のコールバックを呼ぶだけ）。
 *
 * ２段階削除フロー:
 * 1. 「削除する」をクリック → 親が `confirmDelete` を true にする
 * 2. 「本当に削除しますか？削除する/キャンセル」を表示
 * 3. 「削除する」確定で `onConfirmDelete()`、キャンセルで `onCancelDelete()`
 */
import type { Comment } from "@/types/comment";
import { formatDate } from "@/lib/utils";

interface MyCommentCardProps {
  /**
   * 表示する感想。`Comment` のフィールドのうち id / body / created_at のみを使う。
   * 一覧 API（`UserCommentItem`）等とも互換にするため `Pick` で絞る。
   *
   * `updated_at` は現状 UI で使わないため Pick に含めない（YAGNI）。将来「編集済み」
   * マーク等を追加する際に、その PR で `updated_at` を Pick に加える方針。
   */
  comment: Pick<Comment, "id" | "body" | "created_at">;
  onEdit: () => void;
  onStartDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  actionLoading: boolean;
}

export default function MyCommentCard({
  comment,
  onEdit,
  onStartDelete,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
  actionLoading,
}: MyCommentCardProps) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-700">あなたの感想</h3>
        <span className="text-xs text-stone-500">
          {formatDate(comment.created_at)}
        </span>
      </div>

      <p className="mb-4 whitespace-pre-wrap text-sm text-stone-700">
        {comment.body}
      </p>

      {confirmDelete ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600">本当に削除しますか？</span>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={actionLoading}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {actionLoading ? "削除中..." : "削除する"}
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={actionLoading}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            編集する
          </button>
          <button
            type="button"
            onClick={onStartDelete}
            className="text-sm text-stone-500 hover:text-red-600"
          >
            削除する
          </button>
        </div>
      )}
    </div>
  );
}
