import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { uuidSchema } from "@/lib/schemas/common";
import { getPodcastById } from "@/lib/data/podcasts";
import {
  buildMetadataDescription,
  defaultOpenGraph,
  defaultOpenGraphImages,
  defaultTwitter,
} from "@/lib/metadata/shared";
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

/**
 * 番組詳細ページの metadata を動的に生成する。
 *
 * - `getPodcastById` は `cache()` 済みのため、page 本体と generateMetadata で
 *   同じ ID を取得しても API コールは 1 回しか発生しない
 * - DAL が throw した場合は try/catch せず Next.js 標準の挙動（page 側の
 *   `notFound()` で 404 ページとして表示される）に任せる
 * - openGraph / twitter は shallow merge のため、共通の siteName / locale 等を
 *   失わないよう `defaultOpenGraph` / `defaultTwitter` を spread する
 */
export async function generateMetadata({
  params,
}: PodcastPageProps): Promise<Metadata> {
  const { id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const podcast = await getPodcastById(id);

  const title = `${podcast.title} | PodLog`;
  const description = buildMetadataDescription(
    podcast.description,
    `${podcast.title} の番組情報・レビュー | PodLog`,
  );
  const canonicalPath = `/podcasts/${id}`;
  const ogImages = podcast.artwork_url
    ? [podcast.artwork_url]
    : [...defaultOpenGraphImages];
  const twitterImages = podcast.artwork_url
    ? [podcast.artwork_url]
    : ["/og-default.png"];

  return {
    title,
    description,
    openGraph: {
      ...defaultOpenGraph,
      title,
      description,
      url: canonicalPath,
      images: ogImages,
    },
    twitter: {
      ...defaultTwitter,
      title,
      description,
      images: twitterImages,
    },
    alternates: { canonical: canonicalPath },
  };
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
