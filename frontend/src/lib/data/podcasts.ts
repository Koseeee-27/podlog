/**
 * Podcast ドメインの Data Access Layer (DAL)。
 *
 * Server Component から呼ぶ GET 系データ取得関数を集約する。
 *
 * - `import "server-only"` で Client Component からの import を防ぐ
 * - React の `cache()` でラップし、同一リクエスト内の重複取得を防ぐ
 * - エンドポイント URL・`revalidate` 戦略を DAL 側に閉じ込める
 *
 * `/podcasts/:id`, `/podcasts/popular`, `/podcasts/:id/rating`, `/podcasts/search`
 * は公開 API で、Authorization ヘッダーは付けない。
 *
 * `/podcasts/:id/episodes` だけはオプショナル認証で、未ログインでも動くが
 * ログイン中はエピソードに「聴取済み」フラグが付く。Authorization ヘッダーが
 * 付く場合は `cache: "no-store"` を明示して Next.js の fetch キャッシュに
 * 別ユーザーのレスポンスが混ざらないようにする (frontend.md の規約)。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type { PodcastDetailResult, PodcastSearchResult } from "@/types/podcast";
import type { PodcastRatingResult } from "@/types/review";
import type { EpisodeListResult } from "@/types/episode";

/**
 * 番組詳細を取得する (公開)。
 * revalidate: 60 秒。
 */
export const getPodcastById = cache(
  async (id: string): Promise<PodcastDetailResult> => {
    return apiFetch<PodcastDetailResult>(
      `/podcasts/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      },
    );
  },
);

/**
 * 人気の番組一覧を取得する (公開)。
 * revalidate: 300 秒 + `popular-podcasts` タグ。
 *
 * @param limit 取得件数。省略時は API のデフォルト (通常 20)。
 */
export const getPopularPodcasts = cache(
  async (limit?: number): Promise<PodcastSearchResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<PodcastSearchResult>(`/podcasts/popular${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300, tags: ["popular-podcasts"] },
    });
  },
);

/**
 * 番組の評価情報 (平均点 + レビュー総数) を取得する (公開)。
 * revalidate: 60 秒。
 */
export const getPodcastRating = cache(
  async (id: string): Promise<PodcastRatingResult> => {
    return apiFetch<PodcastRatingResult>(
      `/podcasts/${encodeURIComponent(id)}/rating`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      },
    );
  },
);

/**
 * 番組検索 (公開)。
 *
 * `q` (フリーワード) と `genre` (ジャンル ID) のいずれか or 両方を渡す。
 *
 * キャッシュ戦略:
 * - `q` 指定 (フリーワード検索): 検索結果は無数に存在するうえ、iTunes フォール
 *   バック経由で Neon に書き込む副作用があるため `revalidate: 0` (キャッシュなし)
 * - `genre` 指定 (ジャンル一覧): キャッシュが効きやすく、60 秒キャッシュで再訪時の
 *   負荷を抑える
 *
 * (podlog#334 の iTunes フォールバック副作用に関する議論も参照)
 */
export const searchPodcasts = cache(
  async (params: {
    q?: string;
    genre?: string;
    limit?: number;
    offset?: number;
  }): Promise<PodcastSearchResult> => {
    // 入力を trim して空白だけの文字列も「未指定」として扱う。
    // ("   " のような空白のみ入力は検索条件としては無意味なため)
    const trimmedQ = typeof params.q === "string" ? params.q.trim() : "";
    const trimmedGenre =
      typeof params.genre === "string" ? params.genre.trim() : "";
    const hasFreeText = trimmedQ.length > 0;
    const hasGenre = trimmedGenre.length > 0;

    // 検索条件 (`q` / `genre`) のいずれかが必須。
    // バックエンド (`backend/internal/handler/podcast.go: Search`) は
    // `q == "" && genre == ""` のとき 400 を返す。DAL 側で fail-fast にする
    // ことで、呼び出し側の誤呼び出しをランタイム前に分かりやすい形で表面化する。
    if (!hasFreeText && !hasGenre) {
      throw new Error(
        "searchPodcasts: 'q' または 'genre' のいずれかを指定してください",
      );
    }

    const search = new URLSearchParams();
    if (hasFreeText) search.set("q", trimmedQ);
    if (hasGenre) search.set("genre", trimmedGenre);
    if (params.limit !== undefined) search.set("limit", String(params.limit));
    if (params.offset !== undefined)
      search.set("offset", String(params.offset));
    const query = `?${search.toString()}`;

    // フリーワード指定時はキャッシュしない (検索結果は無数 + iTunes フォール
    // バックの副作用あり)。そうでなければ 60 秒キャッシュ。
    const revalidate = hasFreeText ? 0 : 60;

    return apiFetch<PodcastSearchResult>(`/podcasts/search${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate },
    });
  },
);

/**
 * 番組のエピソード一覧を取得する (オプショナル認証)。
 *
 * - 未ログイン: Authorization ヘッダーなし + `next: { revalidate: 60 }`
 * - ログイン中: Authorization ヘッダー付き + `cache: "no-store"` (ユーザー固有
 *   の「聴取済み」フラグが付くため、別ユーザー間でキャッシュが混ざらないよう
 *   フレッシュに取る)
 */
export const getPodcastEpisodes = cache(
  async (
    id: string,
    limit?: number,
    offset?: number,
  ): Promise<EpisodeListResult> => {
    const authHeaders = await getAuthHeaders();
    const hasAuth = "Authorization" in authHeaders;

    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<EpisodeListResult>(
      `/podcasts/${encodeURIComponent(id)}/episodes${query}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        // Authorization 付きのときは Next.js の fetch キャッシュに乗せない。
        // 未ログイン時のみ 60 秒キャッシュ。
        ...(hasAuth
          ? { cache: "no-store" as const }
          : { next: { revalidate: 60 } }),
      },
    );
  },
);
