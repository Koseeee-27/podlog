/**
 * Review ドメインの Data Access Layer (DAL)。
 *
 * - `getReviewsByEpisodeId`: エピソードのレビュー一覧 (公開)。
 *   ユーザー操作で頻繁に変わるため `revalidate: 0` (キャッシュなし)
 * - `getMyReview`: 自分のレビュー (認証必須)。401/404 は呼び出し側で
 *   `ApiRequestError` を catch して未ログイン or 未投稿として扱う
 *   (frontend.md の 401 ハンドリング統一ルール)
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type { ReviewListResult, MyReviewResult } from "@/types/review";

/**
 * エピソードのレビュー一覧を取得する (公開)。
 * `revalidate: 0` (キャッシュなし) — レビューはユーザー操作で頻繁に変わるため。
 */
export const getReviewsByEpisodeId = cache(
  async (
    episodeId: string,
    limit?: number,
    offset?: number,
  ): Promise<ReviewListResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<ReviewListResult>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews${query}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * 自分のエピソードレビューを取得する (認証必須)。
 *
 * 未ログイン時は `getAuthHeaders()` が空オブジェクトを返すが、DAL 側では
 * 事前判定せず `apiFetch` にそのまま投げる。バックエンドは未ログインなら
 * 401、ログイン済みでも未投稿なら 404 を返す。呼び出し側で
 * `ApiRequestError` を catch して未ログイン / 未投稿を判別する。
 *
 * Authorization ヘッダー付きの呼び出しなので `cache: "no-store"` を明示する。
 */
export const getMyReview = cache(
  async (episodeId: string): Promise<MyReviewResult> => {
    const authHeaders = await getAuthHeaders();
    return apiFetch<MyReviewResult>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        cache: "no-store",
      },
    );
  },
);
