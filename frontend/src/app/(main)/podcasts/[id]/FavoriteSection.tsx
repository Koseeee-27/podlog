import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import FavoriteButtonClient from "./FavoriteButtonClient";
import type { User } from "@/types/user";
import type { FavoritePodcastListResult } from "@/types/user";

interface FavoriteSectionProps {
  podcastId: string;
}

/**
 * お気に入りボタンの Server Component。
 * 認証確認 → お気に入り取得 → FavoriteButtonClient を描画する。
 * 未ログインまたは取得失敗時は何も表示しない。
 */
export default async function FavoriteSection({ podcastId }: FavoriteSectionProps) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return null;

  // プロフィール取得（username が必要）
  const profile = await serverGet<User>("/users/me").catch(() => null);
  if (!profile?.username) return null;

  // お気に入り一覧を取得
  const favoritesResult = await serverGet<FavoritePodcastListResult>(
    `/users/${encodeURIComponent(profile.username)}/favorite-podcasts`,
    { noAuth: true, revalidate: 0 },
  ).catch(() => null);

  if (!favoritesResult) return null;

  const isFavorite = favoritesResult.podcasts.some((p) => p.id === podcastId);

  return (
    <FavoriteButtonClient
      podcastId={podcastId}
      initialIsFavorite={isFavorite}
      initialFavorites={favoritesResult.podcasts}
    />
  );
}
