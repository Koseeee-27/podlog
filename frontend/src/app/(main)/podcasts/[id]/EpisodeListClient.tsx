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
  const [initialError, setInitialError] = useState(fetchFailed);
  const [loadMoreError, setLoadMoreError] = useState(false);
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
        setInitialError(false);
        setLoadMoreError(false);
      } catch {
        if (offset === 0) {
          setInitialError(true);
        } else {
          setLoadMoreError(true);
        }
      }
    });
  }

  // 初回取得失敗: 全面エラー + リトライ
  if (initialError && episodes.length === 0) {
    return (
      <ErrorMessage
        message="エピソードの読み込みに失敗しました"
        onRetry={() => handleFetch(0)}
      />
    );
  }

  return (
    <>
      <EpisodeList
        episodes={episodes}
        loading={isLoading}
        hasMore={hasMore && !loadMoreError}
        onLoadMore={() => handleFetch(episodes.length)}
      />
      {loadMoreError && (
        <div className="mt-4">
          <ErrorMessage
            message="追加の読み込みに失敗しました"
            onRetry={() => {
              setLoadMoreError(false);
              handleFetch(episodes.length);
            }}
          />
        </div>
      )}
    </>
  );
}
