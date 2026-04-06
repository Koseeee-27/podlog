"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createReview,
  updateReview,
  deleteReview,
  getEpisodeReviews,
  getMyReviewForEpisode,
} from "@/lib/api/reviews";
import { ApiRequestError } from "@/types/api";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type {
  Review,
  MyReviewResult,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewItem,
} from "@/types/review";

const PAGE_SIZE = 20;

/**
 * エピソードのレビュー一覧を管理するフック。
 */
export function useEpisodeReviews(episodeId: string) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchReviews = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEpisodeReviews(episodeId, { limit: PAGE_SIZE, offset: 0 });
      if (signal?.aborted) return;
      const list = data.reviews ?? [];
      setReviews(list);
      setTotal(data.total);
      setAverageRating(data.average_rating);
      setHasMore(list.length < data.total);
    } catch (err) {
      if (signal?.aborted) return;
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReviews(controller.signal);
    return () => { controller.abort(); };
  }, [fetchReviews]);

  const reviewsLength = reviews.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEpisodeReviews(episodeId, {
        limit: PAGE_SIZE,
        offset: reviewsLength,
      });
      const list = data.reviews ?? [];
      setReviews((prev) => {
        const next = [...prev, ...list];
        return next;
      });
      setTotal(data.total);
      setHasMore(reviewsLength + list.length < data.total);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [episodeId, reviewsLength]);

  return { reviews, total, averageRating, loading, error, hasMore, loadMore, refresh: fetchReviews };
}

/**
 * レビュー投稿・更新・削除を管理するフック。
 */
export function useReviewActions(episodeId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: CreateReviewRequest): Promise<Review | null> => {
    setLoading(true);
    setError(null);
    try {
      const review = await createReview(episodeId, data);
      return review;
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "レビューの投稿に失敗しました"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  const update = useCallback(async (data: UpdateReviewRequest): Promise<Review | null> => {
    setLoading(true);
    setError(null);
    try {
      const review = await updateReview(episodeId, data);
      return review;
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "レビューの更新に失敗しました"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  const remove = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteReview(episodeId);
      return true;
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "レビューの削除に失敗しました"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  return { create, update, remove, loading, error };
}

/**
 * エピソードに対する自分のレビューを取得するフック。
 * ページングに依存せず /episodes/{id}/reviews/mine から直接取得する。
 */
export function useMyReviewForEpisode(episodeId: string, isLoggedIn: boolean) {
  const [myReview, setMyReview] = useState<MyReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchMyReview() {
      if (!isLoggedIn) {
        setMyReview(null);
        setLoading(false);
        setError(null);
        return;
      }
      setMyReview(null);
      setLoading(true);
      setError(null);
      try {
        const review = await getMyReviewForEpisode(episodeId);
        if (!cancelled) {
          setMyReview(review);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setMyReview(null);
          setError(null);
        } else {
          setError(getUserFriendlyErrorMessage(err, "レビューの取得に失敗しました"));
          setMyReview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMyReview();
    return () => { cancelled = true; };
  }, [episodeId, isLoggedIn, refreshKey]);

  const clearMyReview = useCallback(() => {
    setMyReview(null);
  }, []);

  const updateMyReview = useCallback((data: MyReviewResult) => {
    setMyReview(data);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { myReview, loading, error, refresh, clearMyReview, updateMyReview };
}
