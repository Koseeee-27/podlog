"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchPodcasts, getPopularPodcasts } from "@/lib/api/podcasts";
import type { PodcastSearchItem } from "@/types/podcast";

const DEBOUNCE_MS = 400;

export function usePodcastSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
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
      setError(err instanceof Error ? err.message : "検索に失敗しました");
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

export function usePopularPodcasts() {
  const [podcasts, setPodcasts] = useState<PodcastSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPopularPodcasts(10);
        if (!cancelled) setPodcasts(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { podcasts, loading, error };
}
