/**
 * Comment 関連のクライアント API（Client Component から呼び出す fetch ラッパー）。
 *
 * SSR 初期取得は `lib/data/comments.ts`（DAL）を使うこと。
 * mutation（POST/PUT/DELETE）は Server Action 経由で `lib/data/comments.ts` の
 * createComment / updateMyComment / deleteMyComment を呼び出すため、本ファイルには
 * GET 系のページネーション（"もっと見る"）用ラッパーのみを置く。
 *
 * 命名規約: `lib/api/*` は `fetchXxx` で始める（DAL の `getXxx` と区別するため。
 * `frontend.md`「データ取得」セクション参照）。旧 `lib/api/reviews.ts` の
 * `getEpisodeReviews` / `getTimeline` は規約違反だが P-9 で削除予定のため触らない。
 */
import { apiGet } from "./client";
import type {
  EpisodeCommentListResult,
  UserCommentListResult,
  TimelineResult,
} from "@/types/comment";

/** エピソードの感想一覧をページング取得する（公開、もっと見る用）。 */
export function fetchEpisodeComments(
  episodeId: string,
  params?: { limit?: number; offset?: number },
): Promise<EpisodeCommentListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.offset != null) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<EpisodeCommentListResult>(
    `/episodes/${encodeURIComponent(episodeId)}/comments${query ? `?${query}` : ""}`,
  );
}

/** ユーザーの公開感想一覧をページング取得する（公開、もっと見る用）。 */
export function fetchUserComments(
  username: string,
  params?: { limit?: number; offset?: number },
): Promise<UserCommentListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.offset != null) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<UserCommentListResult>(
    `/users/${encodeURIComponent(username)}/comments${query ? `?${query}` : ""}`,
  );
}

/** タイムライン（全ユーザー最新感想）をページング取得する（公開、もっと見る用）。 */
export function fetchTimeline(
  params?: { limit?: number; offset?: number },
): Promise<TimelineResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.offset != null) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<TimelineResult>(`/timeline${query ? `?${query}` : ""}`);
}
