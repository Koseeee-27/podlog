"use client";

import { useState, useCallback, useRef } from "react";
import { updateMyFavoritePodcasts } from "@/lib/api/users";

interface UseFavoritePodcastOptions {
  podcastId: string;
  initialIsFavorite: boolean;
  initialFavoriteIds: string[];
}

/**
 * 特定の番組が「好きな番組」に含まれているかを判定し、
 * 追加・削除を行うフック。
 *
 * 初期値は Server Component から渡される前提。
 */
export function useFavoritePodcast({
  podcastId,
  initialIsFavorite,
  initialFavoriteIds,
}: UseFavoritePodcastOptions) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favoriteIdsRef = useRef<string[]>(initialFavoriteIds);

  const toggle = useCallback(async (): Promise<"added" | "removed" | null> => {
    setError(null);
    setIsPending(true);
    const currentIds = favoriteIdsRef.current;
    const isCurrentlyFavorite = currentIds.includes(podcastId);

    const newIds = isCurrentlyFavorite
      ? currentIds.filter((id) => id !== podcastId)
      : [...currentIds, podcastId];

    try {
      const result = await updateMyFavoritePodcasts(newIds);
      favoriteIdsRef.current = result.podcasts.map((p) => p.id);
      const newIsFavorite = favoriteIdsRef.current.includes(podcastId);
      setIsFavorite(newIsFavorite);
      return isCurrentlyFavorite ? "removed" : "added";
    } catch {
      setError("操作に失敗しました");
      return null;
    } finally {
      setIsPending(false);
    }
  }, [podcastId]);

  return { isFavorite, isPending, error, toggle };
}
