import { Suspense } from "react";
import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/schemas/common";
import { getPodcastById } from "@/lib/data/podcasts";
import { ApiRequestError } from "@/types/api";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
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
    podcast = await getPodcastById(id);
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
        // rating は補助情報（数値 1 行）のため、取得失敗時は fallback={null}
        // で無音非表示にする。設計意図は RatingSection.tsx の JSDoc を参照。
        ratingSlot={
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <RatingSection podcastId={id} />
            </Suspense>
          </ErrorBoundary>
        }
        // お気に入りボタンは認証依存（未ログイン時は 401、プロフィール
        // 未作成時は 404）。FavoriteSection 側で 401/404 を正常系として
        // null を返し、500 系のみ throw → fallback={null} で非表示。
        actions={
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <FavoriteSection podcastId={id} />
            </Suspense>
          </ErrorBoundary>
        }
      />

      {/* エピソード一覧 — ストリーミング */}
      <ErrorBoundary>
        <Suspense fallback={<EpisodeSkeleton />}>
          <EpisodeSection podcastId={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
