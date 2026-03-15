"use client";

import { useState } from "react";
import { useReviewActions, useEpisodeReviews, useMyReviewForEpisode } from "@/hooks/useReviews";
import EpisodeReviewSectionView from "./EpisodeReviewSectionView";
import type { ReviewItem } from "@/types/review";

interface EpisodeReviewSectionProps {
  episodeId: string;
  isLoggedIn: boolean;
  userId: string | null;
}

export default function EpisodeReviewSection({ episodeId, isLoggedIn, userId }: EpisodeReviewSectionProps) {
  const { reviews, total, averageRating, loading: listLoading, error: listError, hasMore, loadMore, refresh } =
    useEpisodeReviews(episodeId);
  const { create, update, remove, loading: actionLoading, error: actionError } = useReviewActions(episodeId);
  const { myReview: myReviewRaw, loading: myReviewLoading, error: myReviewError, refresh: refreshMyReview, clearMyReview, updateMyReview } =
    useMyReviewForEpisode(episodeId, isLoggedIn);
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // MyReviewResult を ReviewItem 互換に変換（user 情報はレビュー一覧から補完）
  const myReview: ReviewItem | null = myReviewRaw && userId
    ? {
        id: myReviewRaw.id,
        user: reviews.find((r) => r.user.id === userId)?.user ?? {
          id: userId,
          username: "",
          display_name: "",
        },
        rating: myReviewRaw.rating,
        comment: myReviewRaw.comment,
        created_at: myReviewRaw.created_at,
      }
    : null;

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
      // 楽観的更新: refetch を待たずにローカル state を即座に反映
      updateMyReview(review);
      setEditing(false);
      refresh();
    }
  };

  const handleDelete = async () => {
    const success = await remove();
    if (success) {
      // 即座にクリア: refetch の 404 待ちに依存しない
      clearMyReview();
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
      editing={editing}
      onStartEdit={() => setEditing(true)}
      onCancelEdit={() => setEditing(false)}
      confirmDelete={confirmDelete}
      onStartDelete={() => setConfirmDelete(true)}
      onCancelDelete={() => setConfirmDelete(false)}
    />
  );
}
