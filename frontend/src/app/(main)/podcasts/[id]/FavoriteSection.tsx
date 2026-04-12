import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import FavoriteButtonClient from "./FavoriteButtonClient";
import type { User } from "@/types/user";
import type { FavoritePodcastListResult } from "@/types/user";

interface FavoriteSectionProps {
  podcastId: string;
}

/**
 * お気に入りボタンの Server Component。
 * プロフィール取得 → お気に入り取得 → FavoriteButtonClient を描画する。
 * 未ログイン（401）なら何も表示しない。
 * 500 系エラーは throw して ErrorBoundary に委譲する。
 */
export default async function FavoriteSection({ podcastId }: FavoriteSectionProps) {
  // プロフィール取得（未ログインなら 401 → null で非表示）
  let profile: User | null = null;
  try {
    profile = await serverGet<User>("/users/me");
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

  if (!profile?.username) return null;

  // お気に入り一覧を取得（公開 API なので認証エラーは起きない。失敗時は throw）
  const favoritesResult = await serverGet<FavoritePodcastListResult>(
    `/users/${encodeURIComponent(profile.username)}/favorite-podcasts`,
    { noAuth: true, revalidate: 0 },
  );

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
