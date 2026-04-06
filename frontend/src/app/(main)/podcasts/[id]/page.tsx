import { Suspense } from "react";
import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import RatingSection from "./RatingSection";
import FavoriteSection from "./FavoriteSection";
import EpisodeSection from "./EpisodeSection";
import { EpisodeSkeleton } from "./skeletons";
import type { PodcastDetailResult } from "@/types/podcast";

interface PodcastPageProps {
  params: Promise<{ id: string }>;
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  // podcast 詳細は必須データ — 取得できなければ 404
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

  return (
    <div>
      {/* podcast 詳細 — 即座に描画 */}
      <PodcastDetail
        podcast={podcast}
        favoriteCount={podcast.favorite_count}
        ratingSlot={
          <Suspense fallback={null}>
            <RatingSection podcastId={id} />
          </Suspense>
        }
        actions={
          <Suspense fallback={null}>
            <FavoriteSection podcastId={id} />
          </Suspense>
        }
      />

      {/* エピソード一覧 — ストリーミング */}
      <Suspense fallback={<EpisodeSkeleton />}>
        <EpisodeSection podcastId={id} />
      </Suspense>
    </div>
  );
}
