"use client";

import { useState, useEffect, useCallback } from "react";
import { getEpisodesByPodcast, getEpisode } from "@/lib/api/episodes";
import type { Episode, EpisodeWithStats } from "@/types/episode";

const PAGE_SIZE = 20;

export function useEpisodes(podcastId: string) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getEpisodesByPodcast(podcastId, { limit: PAGE_SIZE, offset: 0 });
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setEpisodes(list);
          setHasMore(list.length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [podcastId]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const currentLength = (episodes ?? []).length;
      const data = await getEpisodesByPodcast(podcastId, {
        limit: PAGE_SIZE,
        offset: currentLength,
      });
      const list = Array.isArray(data) ? data : [];
      setEpisodes((prev) => [...prev, ...list]);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [podcastId, episodes?.length ?? 0]);

  return { episodes, loading, error, hasMore, loadMore };
}

export function useEpisode(id: string) {
  const [episode, setEpisode] = useState<EpisodeWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getEpisode(id);
        if (!cancelled) setEpisode(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [id]);

  return { episode, loading, error };
}
