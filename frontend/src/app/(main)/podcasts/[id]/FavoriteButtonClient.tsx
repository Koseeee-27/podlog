"use client";

import { useCallback } from "react";
import { useFavoritePodcast } from "@/hooks/useFavoritePodcast";
import { useToast } from "@/components/ui/Toast";
import FavoriteButton from "@/components/podcast/FavoriteButton";
import type { FavoritePodcastItem } from "@/types/user";

interface FavoriteButtonClientProps {
  podcastId: string;
  initialIsFavorite: boolean;
  initialFavorites: FavoritePodcastItem[];
}

export default function FavoriteButtonClient({
  podcastId,
  initialIsFavorite,
  initialFavorites,
}: FavoriteButtonClientProps) {
  const { showToast } = useToast();

  const {
    isFavorite,
    isPending,
    toggle,
  } = useFavoritePodcast({
    podcastId,
    initialIsFavorite,
    initialFavorites,
  });

  const handleToggle = useCallback(async () => {
    const result = await toggle();
    if (result === "added") {
      showToast("好きな番組に追加しました");
    } else if (result === "removed") {
      showToast("好きな番組から削除しました");
    } else {
      showToast("操作に失敗しました", "error");
    }
  }, [toggle, showToast]);

  return (
    <FavoriteButton
      isFavorite={isFavorite}
      isPending={isPending}
      onClick={handleToggle}
    />
  );
}
