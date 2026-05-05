/**
 * レビュー関連のクライアント API (Client Component から呼び出す fetch ラッパー)。
 *
 * SSR 初期取得は `lib/data/reviews.ts` (DAL) を使うこと。
 * mutation (POST/PUT/DELETE) は Server Action 経由で `lib/data/reviews.ts` の
 * createReview / updateMyReview / deleteMyReview を呼び出すため、ここには
 * 置かない (FE 規約: Client Component から apiPost/Put/Delete の直呼びは
 * 現状原則使わず、Server Action 一択)。
 *
 * 本ファイルには Client Component のページネーション ("もっと見る") で
 * 使う GET 系ラッパーのみを残している。
 */
import { apiGet } from "./client";
import type { ReviewListResult, OldTimelineResult } from "@/types/review";

export function getEpisodeReviews(
  episodeId: string,
  params?: { limit?: number; offset?: number }
): Promise<ReviewListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.offset != null) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<ReviewListResult>(
    `/episodes/${encodeURIComponent(episodeId)}/reviews${query ? `?${query}` : ""}`
  );
}

/**
 * 旧モデルの timeline 取得（クライアント API、`{ reviews }` 形）。
 *
 * 過渡期メモ: 新モデル（comment ベース）は `lib/api/comments.ts` の
 * `fetchTimeline` を使う。本関数は命名規約（`fetchXxx`）にも違反しているが、
 * **podlog-workspace#59 の P-9 で削除予定**のため触らない。
 *
 * BE の `/timeline` は既に新 comment ベースに切り替わっているため、本関数を
 * 呼んでも `data.reviews` は undefined になる（P-8 で旧 UI を新型へ置き換える
 * までの暫定）。
 */
export function getTimeline(
  params?: { limit?: number; offset?: number }
): Promise<OldTimelineResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.offset != null) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<OldTimelineResult>(`/timeline${query ? `?${query}` : ""}`);
}
