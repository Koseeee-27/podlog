"use client";

import { useState, useEffect } from "react";
import { getGenres } from "@/lib/api/genres";
import type { Genre } from "@/types/genre";

export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGenres() {
      setLoading(true);
      setError(null);
      try {
        const data = await getGenres();
        if (!cancelled) setGenres(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "ジャンルの取得に失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGenres();
    return () => {
      cancelled = true;
    };
  }, []);

  return { genres, loading, error };
}
