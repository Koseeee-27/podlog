"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { searchPodcasts, getPopularPodcasts, getPodcastsByGenre } from "@/lib/api/podcasts";
import type { PodcastSearchItem } from "@/types/podcast";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const DEBOUNCE_MS = 400;

export function usePodcastSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);

  // initialQuery（URL の ?q=）が変わったら query を同期
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  const [results, setResults] = useState<PodcastSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await searchPodcasts(term);
      setResults(data);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "検索に失敗しました"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      search(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  return { query, setQuery, results, loading, error };
}

export function usePopularPodcasts(enabled = true, limit = 10) {
  const [podcasts, setPodcasts] = useState<PodcastSearchItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPopularPodcasts(limit);
        if (!cancelled) setPodcasts(data);
      } catch (err) {
        if (!cancelled) setError(getUserFriendlyErrorMessage(err, "検索に失敗しました"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [enabled, limit]);

  return { podcasts, loading, error };
}

const GENRE_PAGE_SIZE = 20;

/**
 * 選択されたジャンルの番組一覧を取得するフック。
 * genre が null の場合はフェッチしない。
 * ページネーション対応: loadMore で追加読み込み、hasMore で残りがあるか判定。
 */
export function useGenrePodcasts(genre: string | null) {
  const [podcasts, setPodcasts] = useState<PodcastSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();

  useEffect(() => {
    if (!genre) {
      setPodcasts([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchByGenre() {
      setLoading(true);
      setError(null);
      try {
        const result = await getPodcastsByGenre(genre!, { limit: GENRE_PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setPodcasts(result.podcasts);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) setError(getUserFriendlyErrorMessage(err, "検索に失敗しました"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchByGenre();
    return () => { cancelled = true; };
  }, [genre]);

  const hasMore = podcasts.length < total;

  const loadMore = useCallback(() => {
    if (!genre || !hasMore) return;

    startLoadMore(async () => {
      try {
        const result = await getPodcastsByGenre(genre, {
          limit: GENRE_PAGE_SIZE,
          offset: podcasts.length,
        });
        setPodcasts((prev) => [...prev, ...result.podcasts]);
        setTotal(result.total);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, "追加読み込みに失敗しました"));
      }
    });
  }, [genre, hasMore, podcasts.length]);

  return { podcasts, loading, error, hasMore, loadMore, isLoadingMore };
}
