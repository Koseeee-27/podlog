"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserListeningRecords } from "@/lib/api/listening-records";
import { getUserReviews } from "@/lib/api/reviews";
import { getUserFavoritePodcasts } from "@/lib/api/users";
import type { ListeningRecordItem } from "@/types/listening-record";
import type { UserReviewItem } from "@/types/review";
import type { FavoritePodcastItem } from "@/types/user";

const PAGE_SIZE = 10;

export function useUserListeningRecords(username: string) {
  const [records, setRecords] = useState<ListeningRecordItem[]>([]);
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
        const data = await getUserListeningRecords(username, { limit: PAGE_SIZE, offset: 0 });
        if (controller.signal.aborted) return;
        const list = data.records ?? [];
        setRecords(list);
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
  }, [username]);

  const recordsLength = records.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserListeningRecords(username, {
        limit: PAGE_SIZE,
        offset: recordsLength,
      });
      const list = data.records ?? [];
      setRecords((prev) => [...prev, ...list]);
      setTotal(data.total);
      setHasMore(recordsLength + list.length < data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [username, recordsLength]);

  return { records, total, loading, error, hasMore, loadMore };
}

export function useUserReviews(username: string) {
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
        const data = await getUserReviews(username, { limit: PAGE_SIZE, offset: 0 });
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
  }, [username]);

  const reviewsLength = reviews.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserReviews(username, {
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
  }, [username, reviewsLength]);

  return { reviews, total, loading, error, hasMore, loadMore };
}

export function useUserFavoritePodcasts(username: string) {
  const [podcasts, setPodcasts] = useState<FavoritePodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserFavoritePodcasts(username);
        if (controller.signal.aborted) return;
        setPodcasts(data.podcasts ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetch();
    return () => { controller.abort(); };
  }, [username]);

  return { podcasts, loading, error };
}
