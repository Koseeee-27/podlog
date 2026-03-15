"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createReview,
  updateReview,
  deleteReview,
  getEpisodeReviews,
  getPodcastRating,
  getMyReviews,
  getTimeline,
} from "@/lib/api/reviews";
import type {
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewItem,
  PodcastRatingResult,
  UserReviewItem,
  TimelineItem,
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
      setError(err instanceof Error ? err.message : "読み込み失敗");
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
      setError(err instanceof Error ? err.message : "読み込み失敗");
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
      setError(err instanceof Error ? err.message : "レビューの投稿に失敗しました");
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
      setError(err instanceof Error ? err.message : "レビューの更新に失敗しました");
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
      setError(err instanceof Error ? err.message : "レビューの削除に失敗しました");
      return false;
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  return { create, update, remove, loading, error };
}

/**
 * 自分のレビュー一覧を管理するフック。
 */
export function useMyReviews() {
  const [reviews, setReviews] = useState<UserReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyReviews({ limit: PAGE_SIZE, offset: 0 });
        if (controller.signal.aborted) return;
        const list = data.reviews ?? [];
        setReviews(list);
        setTotal(data.total);
        setHasMore(list.length < data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetch();
    return () => { controller.abort(); };
  }, []);

  const reviewsLength = reviews.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyReviews({
        limit: PAGE_SIZE,
        offset: reviewsLength,
      });
      const list = data.reviews ?? [];
      setReviews((prev) => [...prev, ...list]);
      setTotal(data.total);
      setHasMore(reviewsLength + list.length < data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [reviewsLength]);

  return { reviews, total, loading, error, hasMore, loadMore };
}

/**
 * タイムラインを管理するフック。
 */
export function useTimeline() {
  const [reviews, setReviews] = useState<TimelineItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTimeline({ limit: PAGE_SIZE, offset: 0 });
        if (controller.signal.aborted) return;
        const list = data.reviews ?? [];
        setReviews(list);
        setTotal(data.total);
        setHasMore(list.length < data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetch();
    return () => { controller.abort(); };
  }, []);

  const reviewsLength = reviews.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTimeline({
        limit: PAGE_SIZE,
        offset: reviewsLength,
      });
      const list = data.reviews ?? [];
      setReviews((prev) => [...prev, ...list]);
      setTotal(data.total);
      setHasMore(reviewsLength + list.length < data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [reviewsLength]);

  return { reviews, total, loading, error, hasMore, loadMore };
}

/**
 * ポッドキャストの平均評価・レビュー件数を取得するフック。
 */
export function usePodcastRating(podcastId: string) {
  const [rating, setRating] = useState<PodcastRatingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetch() {
      setLoading(true);
      setError(null);
      setRating(null);
      try {
        const data = await getPodcastRating(podcastId);
        if (controller.signal.aborted) return;
        setRating(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "評価の取得に失敗しました");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetch();
    return () => { controller.abort(); };
  }, [podcastId]);

  return { rating, loading, error };
}
