"use client";

import { useState, useCallback } from "react";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import type { EpisodeListItem } from "@/types/episode";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

/**
 * エピソード一覧を管理するフック。
 * Server Component で取得した初期データを受け取り、ページネーション（loadMore）をクライアントで管理する。
 */
export function useEpisodes(podcastId: string, initialData: EpisodeListItem[]) {
  const [episodes, setEpisodes] = useState<EpisodeListItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialData.length >= PAGE_SIZE);

  const episodesLength = episodes.length;
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
