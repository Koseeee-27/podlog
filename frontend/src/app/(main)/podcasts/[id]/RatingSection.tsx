import { serverGet } from "@/lib/api/server";
import RatingDisplay from "./RatingDisplay";
import type { PodcastRatingResult } from "@/types/review";

interface RatingSectionProps {
  podcastId: string;
}

/**
 * 評価データの Server Component。
 * 評価を取得し、RatingDisplay に渡す。
 *
 * 取得失敗時は throw して ErrorBoundary に委譲する。ただし rating は
 * ポッドキャスト詳細の補助情報（見出し下に 1 行表示されるのみ）であり、
 * ヘッダー周りに大きなエラー UI を出すとレイアウトが崩れるため、呼び出し側
 * （`podcasts/[id]/page.tsx`）では `<ErrorBoundary fallback={null}>` で
 * ラップして、取得失敗時は無音で非表示にする設計を採用している。
 *
 * これは「握りつぶし」ではなく ErrorBoundary への明示的な委譲であり、
 * `componentDidCatch` でエラー監視サービス（Sentry 等）に送信可能。
 */
export default async function RatingSection({ podcastId }: RatingSectionProps) {
  const result = await serverGet<PodcastRatingResult>(
    `/podcasts/${encodeURIComponent(podcastId)}/rating`,
    { noAuth: true, revalidate: 60 },
  );

  return (
    <RatingDisplay
      averageRating={result.average_rating}
      totalReviews={result.total_reviews}
    />
  );
}
