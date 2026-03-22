import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import PodcastPageClient from "./PodcastPageClient";
import type { PodcastDetailResult } from "@/types/podcast";
import type { EpisodeListResult } from "@/types/episode";
import type { PodcastRatingResult } from "@/types/review";

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

  // エピソードと評価は並列で取得（失敗しても画面は表示する）
  const [episodesResult, ratingResult] = await Promise.allSettled([
    serverGet<EpisodeListResult>(
      `/podcasts/${encodeURIComponent(id)}/episodes?limit=20&offset=0`,
      { noAuth: true, revalidate: 60 },
    ),
    serverGet<PodcastRatingResult>(
      `/podcasts/${encodeURIComponent(id)}/rating`,
      { noAuth: true, revalidate: 60 },
    ),
  ]);

  const initialEpisodes =
    episodesResult.status === "fulfilled"
      ? (episodesResult.value.episodes ?? [])
      : undefined;
  const initialRating =
    ratingResult.status === "fulfilled" ? ratingResult.value : null;

  return (
    <PodcastPageClient
      id={id}
      initialPodcast={podcast}
      initialFavoriteCount={podcast.favorite_count}
      initialEpisodes={initialEpisodes}
      initialRating={initialRating}
    />
  );
}
