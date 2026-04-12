"use client";

import { useState, useTransition } from "react";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import EpisodeList from "@/components/episode/EpisodeList";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { EpisodeListItem } from "@/types/episode";

export const PAGE_SIZE = 20;

interface EpisodeListClientProps {
  podcastId: string;
  initialEpisodes: EpisodeListItem[];
  initialTotal: number;
}

/**
 * エピソード一覧の Client Component。
 * 初回データは Server Component から受け取る。初回取得の失敗は
 * Server 側で throw されて ErrorBoundary に委譲されるため、ここでは
 * 「追加読み込み」の失敗のみ扱う。
 *
 * hasMore は `episodes.length < total` の派生値として算出する。
 * `list.length >= PAGE_SIZE` での判定だと、総件数がちょうど PAGE_SIZE の
 * 倍数のときに「もっと読む」が 1 回空振りクリックされる不具合が起きる。
 */
export default function EpisodeListClient({
  podcastId,
  initialEpisodes,
  initialTotal,
}: EpisodeListClientProps) {
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [total, setTotal] = useState(initialTotal);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const hasMore = episodes.length < total;

  function handleLoadMore(offset: number) {
    startTransition(async () => {
      try {
        const data = await getEpisodesByPodcast(podcastId, {
          limit: PAGE_SIZE,
          offset,
        });
        const list = data.episodes ?? [];
        setEpisodes((prev) => [...prev, ...list]);
        setTotal(data.total);
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
