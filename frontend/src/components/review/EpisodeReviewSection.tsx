"use client";

import { useState, useTransition } from "react";
import { getEpisodeReviews } from "@/lib/api/reviews";
import { useToast } from "@/components/ui/Toast";
import { createReviewAction, updateReviewAction, deleteReviewAction } from "@/lib/actions/review";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import EpisodeReviewSectionView from "./EpisodeReviewSectionView";
import type { Review, MyReviewResult, ReviewListResult, ReviewItem } from "@/types/review";

function toMyReviewResult(review: Review): MyReviewResult {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    updated_at: review.updated_at,
  };
}

const PAGE_SIZE = 20;

interface EpisodeReviewSectionProps {
  episodeId: string;
  /** Server Component から渡される初回レビュー一覧 */
  initialReviews: ReviewListResult;
  /** Server Component から渡される自分のレビュー（未ログイン or 未投稿なら null） */
  initialMyReview: MyReviewResult | null;
  /** Server Component で判定済みのログイン状態 */
  isLoggedIn: boolean;
}

export default function EpisodeReviewSection({
  episodeId,
  initialReviews,
  initialMyReview,
  isLoggedIn,
}: EpisodeReviewSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews.reviews ?? []);
  const [total, setTotal] = useState(initialReviews.total);
  const [averageRating, setAverageRating] = useState(initialReviews.average_rating);
  const [hasMore, setHasMore] = useState(
    (initialReviews.reviews ?? []).length < initialReviews.total,
  );
  const [loadMorePending, startLoadMore] = useTransition();

  const [myReview, setMyReview] = useState<MyReviewResult | null>(initialMyReview);
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedReviewId, setDeletedReviewId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const { showToast } = useToast();

  const boundCreateAction = createReviewAction.bind(null, episodeId);
  const boundUpdateAction = updateReviewAction.bind(null, episodeId);

  function handleCreateSuccess(review: Review) {
    setMyReview(toMyReviewResult(review));
    setSubmitted(true);
    refreshReviews();
    showToast("レビューを投稿しました");
  }

  function handleUpdateSuccess(review: Review) {
    setMyReview(toMyReviewResult(review));
    setEditing(false);
    refreshReviews();
    showToast("レビューを更新しました");
  }

  function handleDelete() {
    const reviewId = myReview?.id ?? null;

    startDelete(async () => {
      setDeleteError(null);
      const result = await deleteReviewAction(episodeId);
      if (result.success) {
        setMyReview(null);
        setDeletedReviewId(reviewId);
        setConfirmDelete(false);
        setSubmitted(false);
        refreshReviews();
        showToast("レビューを削除しました");
      } else {
        setDeleteError(result.error ?? "レビューの削除に失敗しました");
      }
    });
  }

  function loadMore() {
    startLoadMore(async () => {
      try {
        const data = await getEpisodeReviews(episodeId, {
          limit: PAGE_SIZE,
          offset: reviews.length,
        });
        const list = data.reviews ?? [];
        setReviews((prev) => [...prev, ...list]);
        setTotal(data.total);
        setHasMore(reviews.length + list.length < data.total);
      } catch (err) {
        showToast(getUserFriendlyErrorMessage(err));
      }
    });
  }

  /** レビュー一覧を先頭から再取得する */
  function refreshReviews() {
    startLoadMore(async () => {
      try {
        const data = await getEpisodeReviews(episodeId, {
          limit: PAGE_SIZE,
          offset: 0,
        });
        const list = data.reviews ?? [];
        setReviews(list);
        setTotal(data.total);
        setAverageRating(data.average_rating);
        setHasMore(list.length < data.total);
      } catch {
        // リフレッシュ失敗は静かに無視（既存データを表示し続ける）
      }
    });
  }

  return (
    <EpisodeReviewSectionView
      reviews={reviews}
      total={total}
      averageRating={averageRating}
      listLoading={loadMorePending}
      hasMore={hasMore}
      onLoadMore={loadMore}
      createAction={boundCreateAction}
      updateAction={boundUpdateAction}
      onCreateSuccess={handleCreateSuccess}
      onUpdateSuccess={handleUpdateSuccess}
      onDelete={handleDelete}
      deleteLoading={isDeleting}
      deleteError={deleteError}
      listError={null}
      submitted={submitted}
      isLoggedIn={isLoggedIn}
      myReview={myReview}
      myReviewLoading={false}
      myReviewError={null}
      deletedReviewId={deletedReviewId}
      editing={editing}
      onStartEdit={() => setEditing(true)}
      onCancelEdit={() => setEditing(false)}
      confirmDelete={confirmDelete}
      onStartDelete={() => setConfirmDelete(true)}
      onCancelDelete={() => setConfirmDelete(false)}
    />
  );
}
