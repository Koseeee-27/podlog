"use client";

import { useState, useCallback, useRef } from "react";
import { updateMyFavoritePodcasts } from "@/lib/api/users";
import type { FavoritePodcastItem } from "@/types/user";

interface UseFavoritePodcastOptions {
  podcastId: string;
  initialIsFavorite: boolean;
  initialFavorites: FavoritePodcastItem[];
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
  initialFavorites,
}: UseFavoritePodcastOptions) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favoritesRef = useRef<FavoritePodcastItem[]>(initialFavorites);

  const toggle = useCallback(async (): Promise<"added" | "removed" | null> => {
    setError(null);
    setIsPending(true);
    const currentFavorites = favoritesRef.current;
    const isCurrentlyFavorite = currentFavorites.some((p) => p.id === podcastId);

    let newIds: string[];
    if (isCurrentlyFavorite) {
      newIds = currentFavorites.filter((p) => p.id !== podcastId).map((p) => p.id);
    } else {
      newIds = [...currentFavorites.map((p) => p.id), podcastId];
    }

    try {
      const result = await updateMyFavoritePodcasts(newIds);
      favoritesRef.current = result.podcasts;
      const newIsFavorite = result.podcasts.some((p) => p.id === podcastId);
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
