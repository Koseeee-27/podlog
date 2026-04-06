"use client";

import { useState, useEffect, useCallback } from "react";
import { getEpisodesByPodcast, fetchEpisodesFromFeed } from "@/lib/api/episodes";
import type { EpisodeListItem, FetchFromFeedResult } from "@/types/episode";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

/**
 * エピソード一覧を管理するフック。
 * initialData が渡された場合は初回フェッチをスキップし、そのデータを初期値として使う。
 */
export function useEpisodes(podcastId: string, initialData?: EpisodeListItem[]) {
  const hasInitialData = initialData !== undefined && initialData.length > 0;
  const [episodes, setEpisodes] = useState<EpisodeListItem[]>(initialData ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(
    hasInitialData ? (initialData ?? []).length >= PAGE_SIZE : true,
  );

  useEffect(() => {
    // initialData が渡された場合は初回フェッチをスキップ
    if (hasInitialData) return;

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getEpisodesByPodcast(podcastId, { limit: PAGE_SIZE, offset: 0 });
        const list = data.episodes ?? [];
        if (!cancelled) {
          setEpisodes(list);
          setHasMore(list.length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(getUserFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [podcastId, hasInitialData]);

  const episodesLength = (episodes ?? []).length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEpisodesByPodcast(podcastId, {
        limit: PAGE_SIZE,
        offset: episodesLength,
      });
      const list = data.episodes ?? [];
      setEpisodes((prev) => [...prev, ...list]);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [podcastId, episodesLength]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEpisodesByPodcast(podcastId, { limit: PAGE_SIZE, offset: 0 });
      const list = data.episodes ?? [];
      setEpisodes(list);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [podcastId]);

  return { episodes, loading, error, hasMore, loadMore, refresh };
}

export function useFetchFromFeed(podcastId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FetchFromFeedResult | null>(null);

  const fetchFromFeed = useCallback(async (): Promise<FetchFromFeedResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchEpisodesFromFeed(podcastId);
      setResult(data);
      return data;
    } catch (err) {
      const message = getUserFriendlyErrorMessage(err, "RSSフィードの取得に失敗しました");
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [podcastId]);

  return { fetchFromFeed, loading, error, result };
}
