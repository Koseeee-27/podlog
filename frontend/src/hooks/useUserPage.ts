"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { getUserListeningRecords } from "@/lib/api/listening-records";
import { getUserReviews } from "@/lib/api/reviews";
import { getUserFavoritePodcasts } from "@/lib/api/users";
import type { ListeningRecordItem } from "@/types/listening-record";
import type { UserReviewItem } from "@/types/review";
import type { FavoritePodcastItem } from "@/types/user";

const PAGE_SIZE = 10;

export function useUserListeningRecords(username: string, enabled: boolean) {
  const [records, setRecords] = useState<ListeningRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasMore = useMemo(() => records.length < total, [records.length, total]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function fetch() {
      setInitialLoading(true);
      setError(null);
      try {
        const data = await getUserListeningRecords(username, { limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        const list = data.records ?? [];
        setRecords(list);
        setTotal(data.total);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username, enabled]);

  const loadMore = () => {
    startTransition(async () => {
      setError(null);
      try {
        const data = await getUserListeningRecords(username, {
          limit: PAGE_SIZE,
          offset: records.length,
        });
        const list = data.records ?? [];
        const next = [...records, ...list];
        setRecords(next);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込み失敗");
      }
    });
  };

  return { records, total, loading: initialLoading || isPending, error, hasMore, loadMore };
}

export function useUserReviews(username: string, enabled: boolean) {
  const [reviews, setReviews] = useState<UserReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasMore = useMemo(() => reviews.length < total, [reviews.length, total]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function fetch() {
      setInitialLoading(true);
      setError(null);
      try {
        const data = await getUserReviews(username, { limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        const list = data.reviews ?? [];
        setReviews(list);
        setTotal(data.total);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username, enabled]);

  const loadMore = () => {
    startTransition(async () => {
      setError(null);
      try {
        const data = await getUserReviews(username, {
          limit: PAGE_SIZE,
          offset: reviews.length,
        });
        const list = data.reviews ?? [];
        const next = [...reviews, ...list];
        setReviews(next);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込み失敗");
      }
    });
  };

  return { reviews, total, loading: initialLoading || isPending, error, hasMore, loadMore };
}

export function useUserFavoritePodcasts(username: string, enabled: boolean) {
  const [podcasts, setPodcasts] = useState<FavoritePodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserFavoritePodcasts(username);
        if (cancelled) return;
        setPodcasts(data.podcasts ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username, enabled]);

  return { podcasts, loading, error };
}
