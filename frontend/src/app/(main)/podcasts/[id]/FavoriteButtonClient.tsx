"use client";

import { useFavoritePodcast } from "@/hooks/useFavoritePodcast";
import { useToast } from "@/components/ui/Toast";
import FavoriteButton from "@/components/podcast/FavoriteButton";

interface FavoriteButtonClientProps {
  podcastId: string;
  initialIsFavorite: boolean;
  initialFavoriteIds: string[];
}

export default function FavoriteButtonClient({
  podcastId,
  initialIsFavorite,
  initialFavoriteIds,
}: FavoriteButtonClientProps) {
  const { showToast } = useToast();

  const { isFavorite, isPending, toggle } = useFavoritePodcast({
    podcastId,
    initialIsFavorite,
    initialFavoriteIds,
    onSuccess: (action) => {
      showToast(action === "added" ? "好きな番組に追加しました" : "好きな番組から削除しました");
    },
    onError: () => {
      showToast("操作に失敗しました", "error");
    },
  });

  return (
    <FavoriteButton
      isFavorite={isFavorite}
      isPending={isPending}
      onClick={toggle}
    />
  );
}
