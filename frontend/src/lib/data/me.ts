/**
 * Me ドメインの Data Access Layer (DAL)。
 *
 * 「自分自身」(`/users/me/...`) のリソースを取得する関数を集約する。
 * すべて認証必須エンドポイントだが、DAL 側では事前に 401 判定を行わない。
 * 呼び出し側 (`page.tsx` 等) で `ApiRequestError` を catch して
 * `redirect("/login")` するか、未ログインフォールバック UI を出すかを
 * 決める (FE 規約の 401 ハンドリング統一ルール)。
 *
 * Authorization ヘッダー付きの呼び出しなので全関数で `cache: "no-store"` を
 * 明示する (Next.js の fetch キャッシュに別ユーザーのレスポンスが混ざる
 * リスクを避けるため、FE 規約)。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type { User } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { RecentEpisodesResult } from "@/types/episode";

/**
 * 自分のプロフィールを取得する (認証必須)。
 *
 * 401 (未ログイン) / 404 (プロフィール未設定) は呼び出し側で
 * `ApiRequestError` を catch して扱う (`/login` または `/profile/setup` への
 * リダイレクト等)。
 */
export const getMyProfile = cache(async (): Promise<User> => {
  const authHeaders = await getAuthHeaders();
  return apiFetch<User>("/users/me", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    cache: "no-store",
  });
});

/**
 * 自分の聴取記録一覧を取得する (認証必須)。
 *
 * `limit` / `offset` を渡せばページネーションが可能。
 */
export const getMyListeningRecords = cache(
  async (
    limit?: number,
    offset?: number,
  ): Promise<ListeningRecordListResult> => {
    const authHeaders = await getAuthHeaders();
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<ListeningRecordListResult>(
      `/users/me/listening-records${query}`,
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

/**
 * 自分が記録した番組の新着エピソードを取得する (認証必須)。
 */
export const getMyRecentEpisodes = cache(
  async (): Promise<RecentEpisodesResult> => {
    const authHeaders = await getAuthHeaders();
    return apiFetch<RecentEpisodesResult>("/users/me/recent-episodes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      cache: "no-store",
    });
  },
);

// 注意: バックエンドには `GET /users/me/favorite-podcasts` エンドポイントは
// 存在しない (`PUT` のみ存在)。お気に入り取得は公開エンドポイント
// `/users/:username/favorite-podcasts` を使うため、`lib/data/users.ts` の
// `getUserFavoritePodcasts(profile.username)` を呼び出すこと。
// 自分自身を解決するには `getMyProfile()` を併用する。`getMyProfile()` 自体は
// `cache()` 済みのため、同一リクエスト内で他の Server Component が既に呼んで
// いれば追加コストはほぼゼロだが、`getUserFavoritePodcasts` 側は別エンドポイント
// なので 1 リクエスト追加される (DAL 側でメモ化されるのは関数引数が同じ場合のみ)。
