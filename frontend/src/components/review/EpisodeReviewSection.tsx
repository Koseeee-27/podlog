"use client";

import { useState, useMemo } from "react";
import { useReviewActions, useEpisodeReviews } from "@/hooks/useReviews";
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
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const myReview = useMemo(() => {
    if (!userId) return null;
    return reviews.find((r) => r.user.id === userId) ?? null;
  }, [reviews, userId]);

  const handleSubmit = async (rating: number, comment: string) => {
    const review = await create({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      setSubmitted(true);
      refresh();
    }
  };

  const handleUpdate = async (rating: number, comment: string) => {
    const review = await update({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      setEditing(false);
      refresh();
    }
  };

  const handleDelete = async () => {
    const success = await remove();
    if (success) {
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
      editing={editing}
      onStartEdit={() => setEditing(true)}
      onCancelEdit={() => setEditing(false)}
      confirmDelete={confirmDelete}
      onStartDelete={() => setConfirmDelete(true)}
      onCancelDelete={() => setConfirmDelete(false)}
    />
  );
}
