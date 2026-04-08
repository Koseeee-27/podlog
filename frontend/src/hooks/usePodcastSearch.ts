"use client";

import { useState, useCallback, useTransition } from "react";
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

interface UseGenrePodcastsOptions {
  /** Server Component で取得した初回データ */
  initialData?: PodcastSearchItem[];
  /** Server Component で取得した総件数 */
  initialTotal?: number;
}

/**
 * ジャンル別番組の追加読み込み（loadMore）を担当するフック。
 * 初回データは Server Component から props 経由で受け取り、
 * このフックは「もっと見る」による追加フェッチのみを行う。
 */
export function useGenrePodcasts(
  genre: string | null,
  options: UseGenrePodcastsOptions = {},
) {
  const { initialData = [], initialTotal = 0 } = options;
  const [podcasts, setPodcasts] = useState<PodcastSearchItem[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();

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

  return { podcasts, loading: false, error, hasMore, loadMore, isLoadingMore };
}
