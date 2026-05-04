import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getEpisodeById } from "@/lib/data/episodes";
import {
  buildMetadataDescription,
  defaultOpenGraph,
  defaultOpenGraphImages,
  defaultTwitter,
  pickMetadataImage,
} from "@/lib/metadata/shared";
import { ApiRequestError } from "@/types/api";
import { uuidSchema } from "@/lib/schemas/common";
import { formatDuration, formatDate, stripHtmlTags } from "@/lib/utils";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ListenButtonSection from "./ListenButtonSection";
import RatingSectionWithAuth from "./RatingSectionWithAuth";
import type { EpisodeDetailResult } from "@/types/episode";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

/**
 * エピソード詳細ページの metadata を動的に生成する。
 *
 * - `getEpisodeById` は `cache()` 済み（オプショナル認証）。page 本体と
 *   generateMetadata で同じ ID を取得しても API コールは 1 回しか発生しない
 * - DAL の throw は page と同じく try/catch して 404 → `notFound()`、それ以外は
 *   rethrow に揃える。`generateMetadata` から素の throw を伝播させると Next.js
 *   のデフォルトエラー画面に倒れて `error.tsx` に届かず、status code が
 *   200/500 にブレる（Next.js Discussion #49925 / Issue #75543）
 * - og:image は episode.artwork_url → podcast.artwork_url → og-default.png の順で
 *   フォールバック（エピソード固有 → 番組のアートワーク → 共通 OG 画像）
 */
export async function generateMetadata({
  params,
}: EpisodePageProps): Promise<Metadata> {
  const { id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  let episode: EpisodeDetailResult;
  try {
    episode = await getEpisodeById(id);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const title = `${episode.title} - ${episode.podcast.title} | PodLog`;
  const description = buildMetadataDescription(
    episode.description,
    `${episode.podcast.title} のエピソード「${episode.title}」 | PodLog`,
  );
  const canonicalPath = `/episodes/${id}`;
  // `pickMetadataImage` で空文字 / null / undefined を一律「無し」に正規化する。
  // 単純な `??` だと空文字を「値あり」として通してしまい、フォールバックが
  // 効かないまま壊れた og:image タグを出力する事故になる。
  const ogImage =
    pickMetadataImage(episode.artwork_url) ??
    pickMetadataImage(episode.podcast.artwork_url);
  const ogImages = ogImage ? [ogImage] : [...defaultOpenGraphImages];
  const twitterImages = ogImage ? [ogImage] : ["/og-default.png"];

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

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;

  // UUID 形式でなければ 404
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  // エピソード詳細のみページレベルで取得する。
  // 評価（認証依存の自分の評価含む）は RatingSectionWithAuth 内で
  // 取得し、Suspense + ErrorBoundary で分離する。
  // `getEpisodeById` はオプショナル認証 — ログイン中は Authorization 付き
  // で `cache: "no-store"`、未ログイン時は `revalidate: 60` でキャッシュ。
  let episode: EpisodeDetailResult;
  try {
    episode = await getEpisodeById(id);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">{episode.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-stone-500">
        {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
        {episode.duration_ms && <span>{formatDuration(episode.duration_ms)}</span>}
        {/*
          評価サマリー表示は RatingSectionWithAuth → EpisodeRatingSection 内に
          一本化した（podlog#393 / 評価/感想分離 podlog-workspace#59）。
          旧 `episode.total_reviews` 参照は podlog#406（P-6.5）の名前一掃で
          types/schemas/Card 系から最終的に消える。
        */}
      </div>

      {/* 聴取ボタン: 認証依存なので Suspense で分離 */}
      <div className="mt-4">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-400"
            >
              読み込み中...
            </button>
          }>
            <ListenButtonSection episodeId={episode.id} />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="mt-2">
        <Link
          href={`/podcasts/${episode.podcast.id}`}
          className="text-sm text-rose-600 hover:text-rose-700"
        >
          ポッドキャストに戻る
        </Link>
      </div>

      {episode.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">説明</h2>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {stripHtmlTags(episode.description)}
          </p>
        </div>
      )}

      <hr className="my-8 border-stone-200" />

      {/* 評価セクション: データ取得中は Skeleton を表示。感想セクションは P-8 で追加 */}
      <div id="rating-section">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="space-y-3">
                <div className="h-6 w-32 rounded bg-stone-200 animate-pulse" />
                <div className="h-20 rounded bg-stone-100 animate-pulse" />
                <div className="h-20 rounded bg-stone-100 animate-pulse" />
              </div>
            }
          >
            <RatingSectionWithAuth episodeId={episode.id} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
