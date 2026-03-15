import type { ReviewItem } from "@/types/review";
import ReviewForm from "./ReviewForm";
import ReviewCard from "./ReviewCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import MyReviewCard from "./MyReviewCard";

export interface EpisodeReviewSectionViewProps {
  reviews: ReviewItem[];
  total: number;
  averageRating: number;
  listLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onUpdate: (rating: number, comment: string) => Promise<void>;
  onDelete: () => Promise<void>;
  actionLoading: boolean;
  actionError?: string | null;
  listError?: string | null;
  submitted: boolean;
  isLoggedIn: boolean;
  myReview: ReviewItem | null;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  confirmDelete: boolean;
  onStartDelete: () => void;
  onCancelDelete: () => void;
}

export default function EpisodeReviewSectionView({
  reviews,
  total,
  averageRating,
  listLoading,
  hasMore,
  onLoadMore,
  onSubmit,
  onUpdate,
  onDelete,
  actionLoading,
  actionError,
  listError,
  submitted,
  isLoggedIn,
  myReview,
  editing,
  onStartEdit,
  onCancelEdit,
  confirmDelete,
  onStartDelete,
  onCancelDelete,
}: EpisodeReviewSectionViewProps) {
  const otherReviews = myReview
    ? reviews.filter((r) => r.id !== myReview.id)
    : reviews;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-stone-900">レビュー</h2>
        {total > 0 && (
          <span className="text-sm text-stone-500">
            {averageRating.toFixed(1)} ({total}件)
          </span>
        )}
      </div>

      {isLoggedIn ? (
        <>
          {myReview && !editing ? (
            <>
              {actionError && <ErrorMessage message={actionError} />}
              <MyReviewCard
                review={myReview}
                onEdit={onStartEdit}
                onDelete={onStartDelete}
                confirmDelete={confirmDelete}
                onConfirmDelete={onDelete}
                onCancelDelete={onCancelDelete}
                actionLoading={actionLoading}
              />
            </>
          ) : myReview && editing ? (
            <div className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-stone-700">レビューを編集</h3>
                <button
                  onClick={onCancelEdit}
                  className="text-sm text-stone-500 hover:text-stone-700"
                >
                  キャンセル
                </button>
              </div>
              {actionError && <ErrorMessage message={actionError} />}
              <ReviewForm
                onSubmit={onUpdate}
                initialRating={myReview.rating}
                initialComment={myReview.comment ?? ""}
                submitLabel="更新する"
                loading={actionLoading}
              />
            </div>
          ) : !submitted ? (
            <div className="rounded-lg border border-stone-200 p-4">
              <h3 className="text-sm font-medium text-stone-700 mb-3">レビューを書く</h3>
              {actionError && <ErrorMessage message={actionError} />}
              <ReviewForm onSubmit={onSubmit} loading={actionLoading} />
            </div>
          ) : (
            <p className="text-sm text-green-600">レビューを投稿しました！</p>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-stone-200 p-4">
          <LoginPromptButton label="ログインしてレビューを書く" />
        </div>
      )}

      {listError && <ErrorMessage message={listError} />}

      {otherReviews.length === 0 && !myReview && !listLoading ? (
        <p className="text-sm text-stone-500">まだレビューはありません</p>
      ) : (
        <div className="space-y-3">
          {otherReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {hasMore && reviews.length > 0 && (
        <button
          onClick={onLoadMore}
          disabled={listLoading}
          className="w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {listLoading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
