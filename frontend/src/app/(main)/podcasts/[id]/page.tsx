import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import { createClient } from "@/lib/supabase/server";
import { ApiRequestError } from "@/types/api";
import PodcastPageClient from "./PodcastPageClient";
import type { PodcastDetailResult } from "@/types/podcast";
import type { EpisodeListResult } from "@/types/episode";
import type { PodcastRatingResult } from "@/types/review";
import type { User } from "@/types/user";
import type { FavoritePodcastListResult } from "@/types/user";

interface PodcastPageProps {
  params: Promise<{ id: string }>;
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  let podcast: PodcastDetailResult;
  try {
    podcast = await serverGet<PodcastDetailResult>(`/podcasts/${encodeURIComponent(id)}`, {
      noAuth: true,
      revalidate: 60,
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // 認証状態の確認
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // エピソード・評価・お気に入りを並列で取得（失敗しても画面は表示する）
  const episodesPromise = serverGet<EpisodeListResult>(
    `/podcasts/${encodeURIComponent(id)}/episodes?limit=20&offset=0`,
    { noAuth: true, revalidate: 60 },
  );
  const ratingPromise = serverGet<PodcastRatingResult>(
    `/podcasts/${encodeURIComponent(id)}/rating`,
    { noAuth: true, revalidate: 60 },
  );
  // 認証済みの場合のみプロフィールとお気に入りを取得
  const profilePromise = authUser
    ? serverGet<User>("/users/me")
    : null;

  const [episodesResult, ratingResult, profileResult] = await Promise.allSettled([
    episodesPromise,
    ratingPromise,
    ...(profilePromise ? [profilePromise] : [Promise.resolve(null)]),
  ]);

  const initialEpisodes =
    episodesResult.status === "fulfilled"
      ? (episodesResult.value.episodes ?? [])
      : undefined;
  const initialRating =
    ratingResult.status === "fulfilled" ? ratingResult.value : null;

  const profile =
    profileResult.status === "fulfilled" ? profileResult.value as User | null : null;

  // プロフィール取得成功時のみお気に入りを取得
  let initialFavorites: FavoritePodcastListResult | null = null;
  if (profile?.username) {
    try {
      initialFavorites = await serverGet<FavoritePodcastListResult>(
        `/users/${encodeURIComponent(profile.username)}/favorite-podcasts`,
        { noAuth: true, revalidate: 0 },
      );
    } catch {
      // お気に入り取得失敗は無視
    }
  }

  const initialIsFavorite = initialFavorites
    ? initialFavorites.podcasts.some((p) => p.id === id)
    : false;

  return (
    <PodcastPageClient
      id={id}
      initialPodcast={podcast}
      initialFavoriteCount={podcast.favorite_count}
      initialEpisodes={initialEpisodes}
      initialRating={initialRating}
      isAuthenticated={!!authUser}
      initialIsFavorite={initialIsFavorite}
      initialFavorites={initialFavorites?.podcasts ?? []}
    />
  );
}
