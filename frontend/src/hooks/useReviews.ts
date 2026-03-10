"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createReview,
  updateReview,
  deleteReview,
  getEpisodeReviews,
  getMyReviews,
  getTimeline,
} from "@/lib/api/reviews";
import type {
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewItem,
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

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEpisodeReviews(episodeId, { limit: PAGE_SIZE, offset: 0 });
      setReviews(data.reviews ?? []);
      setTotal(data.total);
      setAverageRating(data.average_rating);
      setHasMore((data.reviews ?? []).length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getEpisodeReviews(episodeId, { limit: PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setReviews(data.reviews ?? []);
          setTotal(data.total);
          setAverageRating(data.average_rating);
          setHasMore((data.reviews ?? []).length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [episodeId]);

  const reviewsLength = reviews.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEpisodeReviews(episodeId, {
        limit: PAGE_SIZE,
        offset: reviewsLength,
      });
      const list = data.reviews ?? [];
      setReviews((prev) => [...prev, ...list]);
      setTotal(data.total);
      setHasMore(list.length >= PAGE_SIZE);
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
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyReviews({ limit: PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setReviews(data.reviews ?? []);
          setTotal(data.total);
          setHasMore((data.reviews ?? []).length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
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
      setHasMore(list.length >= PAGE_SIZE);
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
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTimeline({ limit: PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setReviews(data.reviews ?? []);
          setTotal(data.total);
          setHasMore((data.reviews ?? []).length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
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
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [reviewsLength]);

  return { reviews, total, loading, error, hasMore, loadMore };
}
