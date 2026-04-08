"use client";

import { useState, useCallback, useTransition } from "react";
import { searchPodcasts } from "@/lib/api/podcasts";
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
