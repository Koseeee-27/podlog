"use client";

import { useState, useEffect, useCallback } from "react";
import { getEpisodesByPodcast, getEpisode, createEpisode } from "@/lib/api/episodes";
import type { Episode, EpisodeWithStats, CreateEpisodeRequest } from "@/types/episode";

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

  const episodesLength = (episodes ?? []).length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEpisodesByPodcast(podcastId, {
        limit: PAGE_SIZE,
        offset: episodesLength,
      });
      const list = Array.isArray(data) ? data : [];
      setEpisodes((prev) => [...prev, ...list]);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [podcastId, episodesLength]);

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

export function useCreateEpisode(podcastId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: CreateEpisodeRequest): Promise<Episode | null> => {
      setLoading(true);
      setError(null);
      try {
        const episode = await createEpisode(podcastId, data);
        return episode;
      } catch (err) {
        const message = err instanceof Error ? err.message : "エピソードの作成に失敗しました";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [podcastId]
  );

  return { create, loading, error };
}
