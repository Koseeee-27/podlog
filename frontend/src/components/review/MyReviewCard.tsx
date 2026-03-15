import type { ReviewItem } from "@/types/review";
import { formatDate } from "@/lib/utils";

interface MyReviewCardProps {
  review: ReviewItem;
  onEdit: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => Promise<void>;
  onCancelDelete: () => void;
  actionLoading: boolean;
}

export default function MyReviewCard({
  review,
  onEdit,
  onDelete,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
  actionLoading,
}: MyReviewCardProps) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-stone-700">あなたのレビュー</h3>
        <span className="text-xs text-stone-500">{formatDate(review.created_at)}</span>
      </div>

      <div className="text-sm text-yellow-500 mb-2">
        {"★".repeat(review.rating)}
        {"☆".repeat(5 - review.rating)}
      </div>

      {review.comment && (
        <p className="text-sm text-stone-700 whitespace-pre-wrap mb-4">{review.comment}</p>
      )}

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
            onClick={onDelete}
            className="text-sm text-stone-500 hover:text-red-600"
          >
            削除する
          </button>
        </div>
      )}
    </div>
  );
}
