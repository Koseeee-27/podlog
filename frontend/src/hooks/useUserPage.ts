"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getUserListeningRecords } from "@/lib/api/listening-records";
import { getUserReviews } from "@/lib/api/reviews";
import { getUserFavoritePodcasts } from "@/lib/api/users";
import type { ListeningRecordItem } from "@/types/listening-record";
import type { UserReviewItem } from "@/types/review";
import type { FavoritePodcastItem } from "@/types/user";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 10;

export function useUserListeningRecords(username: string, enabled: boolean) {
  const [records, setRecords] = useState<ListeningRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

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
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username, enabled]);

  const loadMore = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const offset = records.length;
      const data = await getUserListeningRecords(username, {
        limit: PAGE_SIZE,
        offset,
      });
      const list = data.records ?? [];
      setRecords(prev => [...prev, ...list]);
      setTotal(data.total);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoadingMore(false);
      inFlight.current = false;
    }
  };

  return { records, total, loading: initialLoading || loadingMore, error, hasMore, loadMore };
}

export function useUserReviews(username: string, enabled: boolean) {
  const [reviews, setReviews] = useState<UserReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

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
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username, enabled]);

  const loadMore = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const offset = reviews.length;
      const data = await getUserReviews(username, {
        limit: PAGE_SIZE,
        offset,
      });
      const list = data.reviews ?? [];
      setReviews(prev => [...prev, ...list]);
      setTotal(data.total);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoadingMore(false);
      inFlight.current = false;
    }
  };

  return { reviews, total, loading: initialLoading || loadingMore, error, hasMore, loadMore };
}

export function useUserFavoritePodcasts(username: string, enabled: boolean) {
  const [podcasts, setPodcasts] = useState<FavoritePodcastItem[]>([]);
  const [loading, setLoading] = useState(enabled);
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
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username, enabled]);

  return { podcasts, loading, error };
}
