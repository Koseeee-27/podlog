"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { searchPodcasts, getPodcastsByGenre } from "@/lib/api/podcasts";
import type { PodcastSearchItem } from "@/types/podcast";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

interface UsePodcastSearchOptions {
  initialQuery?: string;
  initialResults?: PodcastSearchItem[];
}

export function usePodcastSearch(options: UsePodcastSearchOptions = {}) {
  const { initialQuery = "", initialResults = [] } = options;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PodcastSearchItem[]>(initialResults);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const search = useCallback((term: string) => {
    const trimmed = term.trim();
    setQuery(trimmed);

    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const data = await searchPodcasts(trimmed);
        setResults(data);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, "検索に失敗しました"));
        setResults([]);
      }
    });
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return { query, results, loading: isPending, error, search, clear };
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
        if (!cancelled) setError(getUserFriendlyErrorMessage(err));
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
