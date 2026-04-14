/**
 * Users (公開プロフィール) ドメインの Data Access Layer (DAL)。
 *
 * 他人のユーザーページ (`/users/:username`) で表示する公開リソースを
 * 取得する関数を集約する。
 *
 * 全エンドポイント公開 API のため、Authorization ヘッダーは付けない。
 * リスト系エンドポイントはユーザー操作で頻繁に変わるため `revalidate: 0`、
 * プロフィール本体だけ `revalidate: 60` に分けている。
 *
 * 自分自身のリソースは `lib/data/me.ts` を使う (認証必須エンドポイント)。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import type { UserPublicProfile, FavoritePodcastListResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";

/**
 * ユーザーの公開プロフィールを取得する (公開)。
 * `revalidate: 60` (プロフィールは頻繁には変わらない)。
 */
export const getUserPublicProfile = cache(
  async (username: string): Promise<UserPublicProfile> => {
    return apiFetch<UserPublicProfile>(
      `/users/${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      },
    );
  },
);

/**
 * ユーザーの聴取記録一覧を取得する (公開)。
 * `revalidate: 0` (ユーザー操作で頻繁に変わるため)。
 */
export const getUserListeningRecords = cache(
  async (
    username: string,
    limit?: number,
    offset?: number,
  ): Promise<ListeningRecordListResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<ListeningRecordListResult>(
      `/users/${encodeURIComponent(username)}/listening-records${query}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * ユーザーのレビュー一覧を取得する (公開)。
 * `revalidate: 0` (ユーザー操作で頻繁に変わるため)。
 */
export const getUserReviews = cache(
  async (
    username: string,
    limit?: number,
    offset?: number,
  ): Promise<UserReviewListResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<UserReviewListResult>(
      `/users/${encodeURIComponent(username)}/reviews${query}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * ユーザーのお気に入り番組一覧を取得する (公開)。
 * `revalidate: 0`。
 */
export const getUserFavoritePodcasts = cache(
  async (username: string): Promise<FavoritePodcastListResult> => {
    return apiFetch<FavoritePodcastListResult>(
      `/users/${encodeURIComponent(username)}/favorite-podcasts`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);
