import type { ReviewItem, MyReviewResult, Review } from "@/types/review";
import type { ReviewFormState } from "@/lib/actions/review";
import ReviewForm from "./ReviewForm";
import ReviewCard from "./ReviewCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import MyReviewCard from "./MyReviewCard";
import EmptyState from "@/components/ui/EmptyState";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export interface EpisodeReviewSectionViewProps {
  reviews: ReviewItem[];
  total: number;
  averageRating: number;
  listLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  createAction: (
    prevState: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>;
  updateAction: (
    prevState: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>;
  onCreateSuccess: (review: Review) => void;
  onUpdateSuccess: (review: Review) => void;
  onDelete: () => void;
  deleteLoading: boolean;
  deleteError?: string | null;
  listError?: string | null;
  submitted: boolean;
  isLoggedIn: boolean;
  myReview: MyReviewResult | null;
  myReviewLoading: boolean;
  myReviewError?: string | null;
  deletedReviewId: string | null;
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
  createAction,
  updateAction,
  onCreateSuccess,
  onUpdateSuccess,
  onDelete,
  deleteLoading,
  deleteError,
  listError,
  submitted,
  isLoggedIn,
  myReview,
  myReviewLoading,
  myReviewError,
  deletedReviewId,
  editing,
  onStartEdit,
  onCancelEdit,
  confirmDelete,
  onStartDelete,
  onCancelDelete,
}: EpisodeReviewSectionViewProps) {
  const otherReviews = reviews.filter((r) => {
    if (myReview && r.id === myReview.id) return false;
    if (deletedReviewId && r.id === deletedReviewId) return false;
    return true;
  });

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
          {myReviewError && <ErrorMessage message={myReviewError} />}
          {myReviewLoading ? (
            <p className="text-sm text-stone-500">読み込み中...</p>
          ) : myReview && !editing ? (
            <>
              {deleteError && <ErrorMessage message={deleteError} />}
              <MyReviewCard
                review={myReview}
                onEdit={onStartEdit}
                onStartDelete={onStartDelete}
                confirmDelete={confirmDelete}
                onConfirmDelete={onDelete}
                onCancelDelete={onCancelDelete}
                actionLoading={deleteLoading}
              />
            </>
          ) : myReview && editing ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-stone-700">レビューを編集</h3>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="text-sm text-stone-500 hover:text-stone-700"
                >
                  キャンセル
                </button>
              </div>
              <ReviewForm
                action={updateAction}
                initialRating={myReview.rating}
                initialComment={myReview.comment ?? ""}
                submitLabel="更新する"
                onSuccess={onUpdateSuccess}
              />
            </div>
          ) : !submitted ? (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-stone-700 mb-3">レビューを書く</h3>
              <ReviewForm
                action={createAction}
                onSuccess={onCreateSuccess}
              />
            </div>
          ) : (
            <p className="text-sm text-green-600">レビューを投稿しました！</p>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <LoginPromptButton label="ログインしてレビューを書く" />
        </div>
      )}

      {listError && <ErrorMessage message={listError} />}

      {otherReviews.length === 0 && !listLoading && !hasMore ? (
        <EmptyState
          icon={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
          message={myReview ? "他のレビューはありません" : "まだレビューはありません"}
        />
      ) : (
        <div className="space-y-3">
          {otherReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {hasMore && reviews.length > 0 && (
        <button
          type="button"
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
