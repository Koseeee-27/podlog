/**
 * Sitemap ドメインの Data Access Layer (DAL)。
 *
 * `app/sitemap.ts` から呼び出され、`sitemap.xml` の生成に必要な
 * id（ないし username）と `updated_at` のみを全件取得する。
 *
 * - `import "server-only"` で Client Component からの import を防ぐ
 * - React の `cache()` でラップし、同一リクエスト内の重複取得を防ぐ
 * - `next: { revalidate: 3600 }` で 1 時間キャッシュ。BE への負荷を抑える
 *
 * ## 認証
 *
 * BE 側の `/sitemap/*` エンドポイントは middleware (`SitemapAuth`) で保護されており、
 * `Authorization: Bearer <SITEMAP_API_TOKEN>` ヘッダーが必要。
 * dev では BE が `isDev=true` で素通しするため、FE 側もヘッダーを付けない。
 *
 * 環境変数 `SITEMAP_API_TOKEN` から読み込む（`NEXT_PUBLIC_` プレフィックス無し
 * = サーバーサイド専用。クライアントバンドルに混入しない）。
 *
 * ## キャッシュ汚染リスクについて
 *
 * 通常の認証必須 DAL（例: `me.ts`）は per-user JWT を `Authorization` に乗せるため、
 * Next.js の fetch キャッシュに乗せると別ユーザーのレスポンスが混入しうる
 * （rules/frontend.md「データ取得」セクション参照）。
 * ただし sitemap API は **すべての呼び出しで同じ shared secret トークンを使う**ため、
 * 全リクエストでレスポンスは同一であり、ユーザー間でレスポンスが混ざる事故は構造的に
 * 起こらない。よって per-user JWT 用の `cache: "no-store"` ガードは不要であり、
 * むしろ `revalidate: 3600` で BE 負荷を抑えるメリットを取る。
 *
 * ## ファイル上限
 *
 * `sitemap.xml` は単一ファイルあたり **50,000 URL / 50 MB** が上限
 * (https://www.sitemaps.org/protocol.html)。
 * 現状（podcasts ~700 件 / episodes ~2000 件 / users 数十件）は十分余裕があるが、
 * 将来 episodes が 10 万件オーダーに増えた場合は **sitemap index 化（分割）が必要**。
 * 本 DAL は単一 sitemap 前提で全件返す実装になっているため、上限超過時は
 * `app/sitemap.ts` を `sitemap.xml` index + 子 sitemap の構成に変更する必要がある。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";

/**
 * sitemap 用 podcast 1 件のレスポンス。BE: `usecase.SitemapPodcastItem` と対応。
 */
export interface SitemapPodcastItem {
  id: string;
  updated_at: string;
}

/**
 * sitemap 用 episode 1 件のレスポンス。BE: `usecase.SitemapEpisodeItem` と対応。
 */
export interface SitemapEpisodeItem {
  id: string;
  updated_at: string;
}

/**
 * sitemap 用 user 1 件のレスポンス。BE: `usecase.SitemapUserItem` と対応。
 * 公開プロフィール URL が `/users/{username}` のため username を返す。
 */
export interface SitemapUserItem {
  username: string;
  updated_at: string;
}

interface SitemapPodcastsResult {
  items: SitemapPodcastItem[];
}

interface SitemapEpisodesResult {
  items: SitemapEpisodeItem[];
}

interface SitemapUsersResult {
  items: SitemapUserItem[];
}

/**
 * `SITEMAP_API_TOKEN` から `Authorization` ヘッダーを組み立てる。
 *
 * - 環境変数が空 / 未設定なら空オブジェクトを返す（dev では BE が素通しする想定）
 * - 値の前後の空白は trim する（環境変数の typo 対策）
 *
 * 戻り値型を `Record<string, string>` に narrow しているのは、`HeadersInit` ユニオン型
 * での `in` 演算子判定が `Headers` インスタンス・配列形式で誤作動するため
 * （rules/frontend.md コーディング規約）。
 */
function getSitemapAuthHeaders(): Record<string, string> {
  const token = process.env.SITEMAP_API_TOKEN?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * sitemap 用に全 podcast の id / updated_at を取得する。
 * revalidate: 3600 秒 (1 時間)。
 */
export const getSitemapPodcasts = cache(
  async (): Promise<SitemapPodcastsResult> => {
    return apiFetch<SitemapPodcastsResult>("/sitemap/podcasts", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getSitemapAuthHeaders(),
      },
      next: { revalidate: 3600 },
    });
  },
);

/**
 * sitemap 用に全 episode の id / updated_at を取得する。
 * revalidate: 3600 秒 (1 時間)。
 */
export const getSitemapEpisodes = cache(
  async (): Promise<SitemapEpisodesResult> => {
    return apiFetch<SitemapEpisodesResult>("/sitemap/episodes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getSitemapAuthHeaders(),
      },
      next: { revalidate: 3600 },
    });
  },
);

/**
 * sitemap 用に有効な全ユーザーの username / updated_at を取得する。
 * ソフトデリート済みユーザーは BE 側で除外される。
 * revalidate: 3600 秒 (1 時間)。
 */
export const getSitemapUsers = cache(
  async (): Promise<SitemapUsersResult> => {
    return apiFetch<SitemapUsersResult>("/sitemap/users", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getSitemapAuthHeaders(),
      },
      next: { revalidate: 3600 },
    });
  },
);
