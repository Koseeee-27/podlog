import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import { uuidSchema } from "@/lib/schemas/common";
import { formatDuration, formatDate, stripHtmlTags } from "@/lib/utils";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import ListenButtonWithPrompt from "@/components/episode/ListenButtonWithPrompt";
import type { EpisodeDetailResult } from "@/types/episode";
import type { ReviewListResult, MyReviewResult } from "@/types/review";
import type { ListeningStatus } from "@/types/listening-record";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

const PAGE_SIZE = 20;

/**
 * serverGet("/users/me") の成否でログイン判定。
 * cache() で同一レンダリングサイクル内の重複呼び出しをメモ化する。
 */
const checkLoggedIn = cache(async (): Promise<boolean> => {
  try {
    await serverGet<unknown>("/users/me");
    return true;
  } catch {
    return false;
  }
});

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;

  // UUID 形式でなければ 404
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  let episode: EpisodeDetailResult;
  try {
    episode = await serverGet<EpisodeDetailResult>(
      `/episodes/${encodeURIComponent(id)}`,
      { noAuth: true, revalidate: 60 },
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // レビュー一覧（公開データなので認証不要）
  const reviewsData = await serverGet<ReviewListResult>(
    `/episodes/${encodeURIComponent(id)}/reviews?limit=${PAGE_SIZE}&offset=0`,
    { noAuth: true, revalidate: 0 },
  );

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

      {/* レビューセクション: 認証データ取得中はスケルトンを表示 */}
      <div id="review-section">
        <Suspense fallback={<ReviewSectionSkeleton reviewsData={reviewsData} />}>
          <ReviewSectionWithAuth
            episodeId={episode.id}
            reviewsData={reviewsData}
          />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * レビューセクションのスケルトン表示。
 * レビュー一覧（公開データ）は表示し、認証依存部分（レビューフォーム等）はスケルトンにする。
 */
function ReviewSectionSkeleton({ reviewsData }: { reviewsData: ReviewListResult }) {
  return (
    <EpisodeReviewSection
      episodeId=""
      initialReviews={reviewsData}
      initialMyReview={null}
      isLoggedIn={false}
    />
  );
}

/**
 * 聴取ボタン。認証状態を Server で取得して表示を分岐する。
 * Suspense 境界の中で使う async Server Component。
 */
async function ListenButtonSection({ episodeId }: { episodeId: string }) {
  const isLoggedIn = await checkLoggedIn();

  if (!isLoggedIn) {
    return <LoginPromptButton label="ログインして記録する" />;
  }

  let listened = false;
  try {
    const status = await serverGet<ListeningStatus>(
      `/episodes/${encodeURIComponent(episodeId)}/listen`,
    );
    listened = status.listened;
  } catch (err) {
    console.warn("[ListenButtonSection] 聴取状態の取得に失敗:", err);
  }

  return (
    <ListenButtonWithPrompt
      episodeId={episodeId}
      initialListened={listened}
    />
  );
}

/**
 * レビューセクション。認証依存データ（自分のレビュー）を Server で取得する。
 */
async function ReviewSectionWithAuth({
  episodeId,
  reviewsData,
}: {
  episodeId: string;
  reviewsData: ReviewListResult;
}) {
  const isLoggedIn = await checkLoggedIn();

  let myReview: MyReviewResult | null = null;
  if (isLoggedIn) {
    try {
      myReview = await serverGet<MyReviewResult>(
        `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        myReview = null;
      } else {
        console.warn("[ReviewSectionWithAuth] 自分のレビュー取得に失敗:", err);
      }
    }
  }

  return (
    <EpisodeReviewSection
      episodeId={episodeId}
      initialReviews={reviewsData}
      initialMyReview={myReview}
      isLoggedIn={isLoggedIn}
    />
  );
}
