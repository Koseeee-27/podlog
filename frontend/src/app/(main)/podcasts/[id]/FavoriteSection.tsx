import { getMyFavoritePodcasts } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import FavoriteButtonClient from "./FavoriteButtonClient";

interface FavoriteSectionProps {
  podcastId: string;
}

/**
 * お気に入りボタンの Server Component。
 *
 * 自分のお気に入り一覧を取得し、現在の番組が含まれているかを判定して
 * `FavoriteButtonClient` に渡す。未ログイン (401) / プロフィール未作成 (404)
 * なら何も表示せず、500 系エラーは throw して ErrorBoundary に委譲する。
 *
 * `/users/me/favorite-podcasts` を直接叩くことで、以前必要だった
 * 「プロフィール取得 → username 解決 → お気に入り取得」の 2 ホップを
 * 1 リクエストに削減している。
 */
export default async function FavoriteSection({ podcastId }: FavoriteSectionProps) {
  let favoriteIds: string[];
  try {
    const favoritesResult = await getMyFavoritePodcasts();
    favoriteIds = favoritesResult.podcasts.map((p) => p.id);
  } catch (err) {
    if (
      err instanceof ApiRequestError &&
      (err.status === 401 || err.status === 404)
    ) {
      // 401: 未ログイン、404: プロフィール未作成 → お気に入りボタンを表示しない
      return null;
    }
    // 500 系やネットワークエラーは ErrorBoundary に委譲
    throw err;
  }

  const isFavorite = favoriteIds.includes(podcastId);

  return (
    <FavoriteButtonClient
      podcastId={podcastId}
      initialIsFavorite={isFavorite}
      initialFavoriteIds={favoriteIds}
    />
  );
}
