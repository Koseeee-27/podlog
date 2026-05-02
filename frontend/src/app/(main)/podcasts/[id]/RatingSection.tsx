import { getPodcastRating } from "@/lib/data/ratings";
import RatingDisplay from "./RatingDisplay";

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
 * Server 側で throw されたエラーは `src/instrumentation.ts` の `onRequestError`
 * が自動で Sentry に送信するため、取得失敗は無音で隠しても観測は欠落しない。
 *
 * podlog#390（BE）で `total_reviews` → `total_ratings` に切替済みのため、
 * 本コンポーネントも `result.total_ratings` を読む（旧 `total_reviews` を
 * 読んでいた状態は実行時 undefined になっていた）。RatingDisplay 側の
 * prop 名 `totalReviews` の追従と表示文言（「件のレビュー」）は P-6 の責務。
 */
export default async function RatingSection({ podcastId }: RatingSectionProps) {
  const result = await getPodcastRating(podcastId);

  return (
    <RatingDisplay
      averageRating={result.average_rating}
      totalReviews={result.total_ratings}
    />
  );
}
