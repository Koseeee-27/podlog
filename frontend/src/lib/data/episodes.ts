/**
 * Episode ドメインの Data Access Layer (DAL)。
 *
 * - `getEpisodeById`: エピソード詳細 (オプショナル認証)。ログイン中は
 *   「聴取済み」等のユーザー固有情報が付くため、Authorization を付けるときは
 *   `cache: "no-store"` を明示する
 * - `getEpisodeListenStatus`: 自分の聴取状態 (認証必須)。401 は DAL 側では
 *   throw せず、呼び出し側で `ApiRequestError` を catch して未ログイン
 *   扱いにする (FE 規約)
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type { EpisodeDetailResult } from "@/types/episode";
import type { ListeningStatus } from "@/types/listening-record";

/**
 * エピソード詳細を取得する (オプショナル認証)。
 *
 * - 未ログイン: Authorization なし + `revalidate: 60`
 * - ログイン中: Authorization 付き + `cache: "no-store"`
 */
export const getEpisodeById = cache(
  async (id: string): Promise<EpisodeDetailResult> => {
    const authHeaders = await getAuthHeaders();
    const hasAuth = "Authorization" in authHeaders;

    return apiFetch<EpisodeDetailResult>(
      `/episodes/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        ...(hasAuth
          ? { cache: "no-store" as const }
          : { next: { revalidate: 60 } }),
      },
    );
  },
);

/**
 * 自分のエピソード聴取状態を取得する (認証必須)。
 *
 * 未ログイン時は `getAuthHeaders()` が空オブジェクトを返すが、DAL 側では
 * 事前判定せず `apiFetch` にそのまま投げる。バックエンドが 401 を返すので
 * 呼び出し側で `ApiRequestError` を catch して未ログイン扱いにする
 * (FE 規約: 保護ページ・公開ページで 401 ハンドリングを統一するため)。
 *
 * Authorization ヘッダー付きの呼び出しなので `cache: "no-store"` を明示する。
 */
export const getEpisodeListenStatus = cache(
  async (episodeId: string): Promise<ListeningStatus> => {
    const authHeaders = await getAuthHeaders();
    return apiFetch<ListeningStatus>(
      `/episodes/${encodeURIComponent(episodeId)}/listen`,
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
