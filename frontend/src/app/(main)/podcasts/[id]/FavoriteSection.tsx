import { serverGet } from "@/lib/api/server";
import FavoriteButtonClient from "./FavoriteButtonClient";
import type { User } from "@/types/user";
import type { FavoritePodcastListResult } from "@/types/user";

interface FavoriteSectionProps {
  podcastId: string;
}

/**
 * お気に入りボタンの Server Component。
 * プロフィール取得 → お気に入り取得 → FavoriteButtonClient を描画する。
 * 未ログイン（401）または取得失敗時は何も表示しない。
 */
export default async function FavoriteSection({ podcastId }: FavoriteSectionProps) {
  // プロフィール取得（未ログインなら 401 で null）
  const profile = await serverGet<User>("/users/me").catch(() => null);
  if (!profile?.username) return null;

  // お気に入り一覧を取得
  const favoritesResult = await serverGet<FavoritePodcastListResult>(
    `/users/${encodeURIComponent(profile.username)}/favorite-podcasts`,
    { noAuth: true, revalidate: 0 },
  ).catch(() => null);

  if (!favoritesResult) return null;

  const favoriteIds = favoritesResult.podcasts.map((p) => p.id);
  const isFavorite = favoriteIds.includes(podcastId);

  return (
    <FavoriteButtonClient
      podcastId={podcastId}
      initialIsFavorite={isFavorite}
      initialFavoriteIds={favoriteIds}
    />
  );
}
