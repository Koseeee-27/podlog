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

/**
 * エピソード一覧の Client Component。
 * 初回データは Server Component から受け取る。初回取得の失敗は
 * Server 側で throw されて ErrorBoundary に委譲されるため、ここでは
 * 「追加読み込み」の失敗のみ扱う。
 */
export default function EpisodeListClient({
  podcastId,
  initialEpisodes,
}: EpisodeListClientProps) {
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(initialEpisodes.length >= PAGE_SIZE);
  const [isLoading, startTransition] = useTransition();

  function handleLoadMore(offset: number) {
    startTransition(async () => {
      try {
        const data = await getEpisodesByPodcast(podcastId, {
          limit: PAGE_SIZE,
          offset,
        });
        const list = data.episodes ?? [];
        setEpisodes((prev) => [...prev, ...list]);
        setHasMore(list.length >= PAGE_SIZE);
        setLoadMoreError(false);
      } catch {
        setLoadMoreError(true);
      }
    });
  }

  return (
    <>
      <EpisodeList
        episodes={episodes}
        loading={isLoading}
        hasMore={hasMore && !loadMoreError}
        onLoadMore={() => handleLoadMore(episodes.length)}
      />
      {loadMoreError && (
        <div className="mt-4">
          <ErrorMessage
            message="追加の読み込みに失敗しました"
            onRetry={() => {
              setLoadMoreError(false);
              handleLoadMore(episodes.length);
            }}
          />
        </div>
      )}
    </>
  );
}
