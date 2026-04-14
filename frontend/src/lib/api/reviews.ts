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
import type { ReviewListResult, TimelineResult } from "@/types/review";

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

export function getTimeline(
  params?: { limit?: number; offset?: number }
): Promise<TimelineResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.offset != null) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<TimelineResult>(`/timeline${query ? `?${query}` : ""}`);
}
