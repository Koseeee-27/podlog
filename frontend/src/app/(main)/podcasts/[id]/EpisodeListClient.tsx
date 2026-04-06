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
  /** Server Component での初回取得が失敗したか */
  fetchFailed?: boolean;
}

export default function EpisodeListClient({
  podcastId,
  initialEpisodes,
  fetchFailed = false,
}: EpisodeListClientProps) {
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [error, setError] = useState<string | null>(
    fetchFailed ? "エピソードの読み込みに失敗しました" : null,
  );
  const [hasMore, setHasMore] = useState(initialEpisodes.length >= PAGE_SIZE);
  const [isLoading, startTransition] = useTransition();

  function handleFetch(offset: number) {
    startTransition(async () => {
      try {
        const data = await getEpisodesByPodcast(podcastId, {
          limit: PAGE_SIZE,
          offset,
        });
        const list = data.episodes ?? [];
        if (offset === 0) {
          setEpisodes(list);
        } else {
          setEpisodes(prev => [...prev, ...list]);
        }
        setHasMore(list.length >= PAGE_SIZE);
        setError(null);
      } catch {
        setError("エピソードの読み込みに失敗しました");
      }
    });
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => handleFetch(0)}
      />
    );
  }

  return (
    <EpisodeList
      episodes={episodes}
      loading={isLoading}
      hasMore={hasMore}
      onLoadMore={() => handleFetch(episodes.length)}
    />
  );
}
