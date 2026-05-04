import type { MyRatingResult } from "@/types/rating";
import { formatDate, formatStars } from "@/lib/utils";

interface MyRatingCardProps {
  rating: MyRatingResult;
  onEdit: () => void;
  onStartDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  actionLoading: boolean;
}

/**
 * 自分の評価を表示するカード（編集・削除ボタン付き）。
 *
 * 旧 `components/review/MyReviewCard.tsx` から `comment` 表示を取り除き、
 * 星評価のみを表示する形に縮約したコンポーネント。評価/感想分離（podlog-workspace#59）
 * に伴い、評価カードは「いつ・何点付けたか」のみを示し、本文は感想セクション
 * 側の `MyCommentCard`（podlog#391 系で実装予定）が担う。
 */
export default function MyRatingCard({
  rating,
  onEdit,
  onStartDelete,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
  actionLoading,
}: MyRatingCardProps) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-stone-700">あなたの評価</h3>
        <span className="text-xs text-stone-500">{formatDate(rating.created_at)}</span>
      </div>

      <div className="text-sm text-yellow-500 mb-3">
        {formatStars(rating.rating)}
      </div>

      {confirmDelete ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600">本当に削除しますか？</span>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={actionLoading}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
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
            className="text-sm text-rose-600 hover:text-rose-700 font-medium"
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
