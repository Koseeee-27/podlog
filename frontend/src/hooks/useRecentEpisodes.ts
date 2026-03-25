"use client";

import { useState, useEffect } from "react";
import { getRecentEpisodes } from "@/lib/api/episodes";
import type { RecentEpisodeItem } from "@/types/episode";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

/**
 * ユーザーが過去に記録した番組の新着エピソードを取得するフック。
 * enabled が false の場合はフェッチをスキップする（未認証時など）。
 */
export function useRecentEpisodes(enabled: boolean) {
  const [episodes, setEpisodes] = useState<RecentEpisodeItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [recordedPodcastCount, setRecordedPodcastCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRecent() {
      setLoading(true);
      setError(null);
      try {
        const result = await getRecentEpisodes();
        if (!cancelled) {
          setEpisodes(result.episodes ?? []);
          setIsEmpty((result.episodes ?? []).length === 0);
          setRecordedPodcastCount(result.recorded_podcast_count ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getUserFriendlyErrorMessage(err, "新着エピソードの取得に失敗しました"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecent();
    return () => { cancelled = true; };
  }, [enabled]);

  return { episodes, loading, error, isEmpty, recordedPodcastCount };
}
