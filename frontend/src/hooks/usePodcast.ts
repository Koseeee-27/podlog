"use client";

import { useState, useEffect } from "react";
import { getPodcast } from "@/lib/api/podcasts";
import type { Podcast } from "@/types/podcast";

export function usePodcast(id: string) {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPodcast(id);
        if (!cancelled) setPodcast(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [id]);

  return { podcast, loading, error };
}
