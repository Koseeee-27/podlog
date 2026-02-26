"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchPodcasts } from "@/lib/api/podcasts";
import type { Podcast } from "@/types/podcast";

const DEBOUNCE_MS = 400;

export function usePodcastSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Podcast[]>([]);
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
