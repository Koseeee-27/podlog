"use client";

import { useState } from "react";
import { useReviewActions, useEpisodeReviews, useMyReviewForEpisode } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import EpisodeReviewSectionView from "./EpisodeReviewSectionView";
import type { Review, MyReviewResult } from "@/types/review";

function toMyReviewResult(review: Review): MyReviewResult {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    updated_at: review.updated_at,
  };
}

interface EpisodeReviewSectionProps {
  episodeId: string;
}

export default function EpisodeReviewSection({ episodeId }: EpisodeReviewSectionProps) {
  const auth = useAuth();
  const isLoggedIn = auth.status === "authenticated" || auth.status === "no_profile";
  const { reviews, total, averageRating, loading: listLoading, error: listError, hasMore, loadMore, refresh } =
    useEpisodeReviews(episodeId);
  const { create, update, remove, loading: actionLoading, error: actionError } = useReviewActions(episodeId);
  const { myReview, loading: myReviewLoading, error: myReviewError, clearMyReview, updateMyReview } =
    useMyReviewForEpisode(episodeId, isLoggedIn);
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedReviewId, setDeletedReviewId] = useState<string | null>(null);

  const handleSubmit = async (rating: number, comment: string) => {
    const review = await create({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      updateMyReview(toMyReviewResult(review));
      setSubmitted(true);
      refresh();
      showToast("レビューを投稿しました");
    }
  };

  const handleUpdate = async (rating: number, comment: string) => {
    const review = await update({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      updateMyReview(toMyReviewResult(review));
      setEditing(false);
      refresh();
      showToast("レビューを更新しました");
    }
  };

  const handleDelete = async () => {
    const reviewId = myReview?.id ?? null;
    const success = await remove();
    if (success) {
      clearMyReview();
      setDeletedReviewId(reviewId);
      setConfirmDelete(false);
      setSubmitted(false);
      refresh();
      showToast("レビューを削除しました");
    }
  };

  return (
    <EpisodeReviewSectionView
      reviews={reviews}
      total={total}
      averageRating={averageRating}
      listLoading={listLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onSubmit={handleSubmit}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      actionLoading={actionLoading}
      actionError={actionError}
      listError={listError}
      submitted={submitted}
      isLoggedIn={isLoggedIn}
      myReview={myReview}
      myReviewLoading={myReviewLoading}
      myReviewError={myReviewError}
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
