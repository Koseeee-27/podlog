import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import PodcastPageClient from "./PodcastPageClient";
import type { Podcast } from "@/types/podcast";
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

  let podcast: Podcast;
  try {
    podcast = await serverGet<Podcast>(`/podcasts/${encodeURIComponent(id)}`, {
      noAuth: true,
      revalidate: 60,
    });
  } catch {
    notFound();
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
      initialEpisodes={initialEpisodes}
      initialRating={initialRating}
    />
  );
}
