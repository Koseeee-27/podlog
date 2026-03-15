"use client";

import { useState } from "react";
import { useReviewActions, useEpisodeReviews, useMyReviewForEpisode } from "@/hooks/useReviews";
import EpisodeReviewSectionView from "./EpisodeReviewSectionView";

interface EpisodeReviewSectionProps {
  episodeId: string;
  isLoggedIn: boolean;
  userId: string | null;
}

export default function EpisodeReviewSection({ episodeId, isLoggedIn, userId }: EpisodeReviewSectionProps) {
  const { reviews, total, averageRating, loading: listLoading, error: listError, hasMore, loadMore, refresh } =
    useEpisodeReviews(episodeId);
  const { create, update, remove, loading: actionLoading, error: actionError } = useReviewActions(episodeId);
  const { myReview, loading: myReviewLoading, error: myReviewError, refresh: refreshMyReview, clearMyReview, updateMyReview } =
    useMyReviewForEpisode(episodeId, isLoggedIn);
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedReviewId, setDeletedReviewId] = useState<string | null>(null);

  void userId; // userId は myReview の特定に不要（useMyReviewForEpisode が直接取得）

  const handleSubmit = async (rating: number, comment: string) => {
    const review = await create({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      setSubmitted(true);
      refresh();
      refreshMyReview();
    }
  };

  const handleUpdate = async (rating: number, comment: string) => {
    const review = await update({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      updateMyReview({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        updated_at: review.updated_at,
      });
      setEditing(false);
      refresh();
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
