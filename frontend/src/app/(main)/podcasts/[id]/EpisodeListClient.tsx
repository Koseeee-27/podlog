"use client";

import { useEffect, useRef, useCallback, useTransition } from "react";
import { useEpisodes } from "@/hooks/useEpisodes";
import { fetchFromFeedAction } from "@/lib/actions/episodes";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EpisodeList from "@/components/episode/EpisodeList";
import type { EpisodeListItem } from "@/types/episode";

interface EpisodeListClientProps {
  podcastId: string;
  initialEpisodes: EpisodeListItem[];
  /** RSS フィード URL（ログイン済みかつ存在する場合に自動フェッチ） */
  feedUrl?: string;
  isAuthenticated: boolean;
}

export default function EpisodeListClient({
  podcastId,
  initialEpisodes,
  feedUrl,
  isAuthenticated,
}: EpisodeListClientProps) {
  const {
    episodes,
    loading: episodesLoading,
    error: episodesError,
    hasMore,
    loadMore,
    refresh,
  } = useEpisodes(podcastId, initialEpisodes);

  // RSS フィードからエピソードを取得（Server Action）
  const [fetchPending, startFetchTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  const handleFetchFromFeed = useCallback(() => {
    startFetchTransition(async () => {
      const result = await fetchFromFeedAction(podcastId);
      if (result.success && result.newCount && result.newCount > 0) {
        await refresh();
      }
      if (!result.success) {
        hasFetchedRef.current = false;
      }
    });
  }, [podcastId, refresh]);

  // ログイン済みかつ feed_url がある場合のみ、初回に自動で RSS フィードからエピソードを取得する
  useEffect(() => {
    if (!isAuthenticated || !feedUrl || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    handleFetchFromFeed();
  }, [isAuthenticated, feedUrl, handleFetchFromFeed]);

  if (episodesError) {
    return <ErrorMessage message={episodesError} />;
  }

  return (
    <EpisodeList
      episodes={episodes}
      loading={episodesLoading || fetchPending}
      hasMore={hasMore}
      onLoadMore={loadMore}
    />
  );
}
