"use client";

import { useState, useTransition } from "react";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import EpisodeList from "@/components/episode/EpisodeList";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { EpisodeListItem } from "@/types/episode";

const PAGE_SIZE = 20;

interface EpisodeListClientProps {
  podcastId: string;
  initialEpisodes: EpisodeListItem[];
}

export default function EpisodeListClient({
  podcastId,
  initialEpisodes,
}: EpisodeListClientProps) {
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialEpisodes.length >= PAGE_SIZE);
  const [isLoadingMore, startLoadMore] = useTransition();

  function handleLoadMore() {
    startLoadMore(async () => {
      try {
        const data = await getEpisodesByPodcast(podcastId, {
          limit: PAGE_SIZE,
          offset: episodes.length,
        });
        const list = data.episodes ?? [];
        setEpisodes(prev => [...prev, ...list]);
        setHasMore(list.length >= PAGE_SIZE);
      } catch {
        setError("エピソードの読み込みに失敗しました");
      }
    });
  }

  if (error) return <ErrorMessage message={error} />;

  return (
    <EpisodeList
      episodes={episodes}
      loading={isLoadingMore}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
    />
  );
}
