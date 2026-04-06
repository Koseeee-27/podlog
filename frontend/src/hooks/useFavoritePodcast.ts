"use client";

import { useState, useTransition } from "react";
import { updateMyFavoritePodcasts } from "@/lib/api/users";

interface UseFavoritePodcastOptions {
  podcastId: string;
  initialIsFavorite: boolean;
  initialFavoriteIds: string[];
  onSuccess?: (action: "added" | "removed") => void;
  onError?: () => void;
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
  onSuccess,
  onError,
}: UseFavoritePodcastOptions) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [favoriteIds, setFavoriteIds] = useState(initialFavoriteIds);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const isCurrentlyFavorite = favoriteIds.includes(podcastId);
      const newIds = isCurrentlyFavorite
        ? favoriteIds.filter((id) => id !== podcastId)
        : [...favoriteIds, podcastId];

      try {
        const result = await updateMyFavoritePodcasts(newIds);
        const updatedIds = result.podcasts.map((p) => p.id);
        setFavoriteIds(updatedIds);
        setIsFavorite(updatedIds.includes(podcastId));
        onSuccess?.(isCurrentlyFavorite ? "removed" : "added");
      } catch {
        onError?.();
      }
    });
  }

  return { isFavorite, isPending, toggle };
}
