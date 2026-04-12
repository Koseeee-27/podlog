import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import { uuidSchema } from "@/lib/schemas/common";
import { formatDuration, formatDate, stripHtmlTags } from "@/lib/utils";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ListenButtonSection from "./ListenButtonSection";
import ReviewSectionWithAuth from "./ReviewSectionWithAuth";
import type { EpisodeDetailResult } from "@/types/episode";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;

  // UUID 形式でなければ 404
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const encodedId = encodeURIComponent(id);

  // エピソード詳細のみページレベルで取得する。
  // レビュー（認証依存の自分のレビュー含む）は ReviewSectionWithAuth 内で
  // 取得し、Suspense + ErrorBoundary で分離する。
  let episode: EpisodeDetailResult;
  try {
    episode = await serverGet<EpisodeDetailResult>(
      `/episodes/${encodedId}`,
      { noAuth: true, revalidate: 60 },
    );
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
        {episode.total_reviews > 0 && (
          <span>
            {episode.average_rating.toFixed(1)} ({episode.total_reviews}件のレビュー)
          </span>
        )}
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

      {/* レビューセクション: データ取得中は Skeleton を表示 */}
      <div id="review-section">
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
            <ReviewSectionWithAuth episodeId={episode.id} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
