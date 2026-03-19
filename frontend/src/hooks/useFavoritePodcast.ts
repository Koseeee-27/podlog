"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { getUserFavoritePodcasts, updateMyFavoritePodcasts } from "@/lib/api/users";
import type { FavoritePodcastItem } from "@/types/user";

/**
 * 特定の番組が「好きな番組」に含まれているかを判定し、
 * 追加・削除を行うフック。
 *
 * @param podcastId 対象の番組 ID
 * @param username ログイン中ユーザーの username（未ログイン時は undefined）
 */
export function useFavoritePodcast(podcastId: string, username: string | undefined) {
  const [isFavorite, setIsFavorite] = useState(false);
  // username が無い場合はデータ取得不要なので loading を false で初期化
  const [loading, setLoading] = useState(!!username);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 現在の好きな番組リスト全体を保持（追加・削除時に一括更新 API を使うため）
  const favoritesRef = useRef<FavoritePodcastItem[]>([]);

  useEffect(() => {
    if (!username) {
      return;
    }

    let cancelled = false;
    getUserFavoritePodcasts(username)
      .then((result) => {
        if (!cancelled) {
          favoritesRef.current = result.podcasts;
          setIsFavorite(result.podcasts.some((p) => p.id === podcastId));
        }
      })
      .catch(() => {
        // 取得失敗時はボタンを非表示にしないが、isFavorite は false のまま
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [podcastId, username]);

  const toggle = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const currentFavorites = favoritesRef.current;
        const isCurrentlyFavorite = currentFavorites.some((p) => p.id === podcastId);

        let newIds: string[];
        if (isCurrentlyFavorite) {
          newIds = currentFavorites.filter((p) => p.id !== podcastId).map((p) => p.id);
        } else {
          newIds = [...currentFavorites.map((p) => p.id), podcastId];
        }

        const result = await updateMyFavoritePodcasts(newIds);
        favoritesRef.current = result.podcasts;
        setIsFavorite(result.podcasts.some((p) => p.id === podcastId));
      } catch {
        setError("操作に失敗しました");
      }
    });
  }, [podcastId, startTransition]);

  return { isFavorite, loading, isPending, error, toggle };
}
