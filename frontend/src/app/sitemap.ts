import type { MetadataRoute } from "next";
import {
  getSitemapPodcasts,
  getSitemapEpisodes,
  getSitemapUsers,
} from "@/lib/data/sitemap";
import { getSiteOrigin } from "@/lib/metadata/site-url";

/**
 * `app/sitemap.ts` は Next.js 16 の File Convention で
 * `https://<domain>/sitemap.xml` を動的に生成する。
 *
 * ## 構成
 *
 * - **静的 URL**: `/`, `/discover`, `/terms`, `/privacy` （`priority: 1.0`）
 * - **動的 URL**: BE の `/sitemap/{podcasts,episodes,users}` から全件取得して展開
 *   - `/podcasts/[id]`, `/episodes/[id]`, `/users/[username]`
 *   - `priority: 0.7`, `changeFrequency: "weekly"`
 *   - `lastModified` は BE が返す `updated_at` （RFC3339 / UTC）
 *
 * ## エラーハンドリング
 *
 * BE 取得失敗時は **静的 URL のみを返す**（動的部分は空配列にフォールバック）。
 * Google クローラーに 500 を返すとペナルティ（クロール頻度低下）の可能性があるため、
 * sitemap 全体を落とすよりも部分的でも返す方が安全。失敗は `console.warn` で残し、
 * 観測は `apiFetch` 内の WARN ログ（リトライ）と `instrumentation.ts` 経由の Sentry
 * `onRequestError` で行う。
 *
 * ## ファイル上限
 *
 * `sitemap.xml` は単一ファイル **50,000 URL / 50 MB** が上限
 * (https://www.sitemaps.org/protocol.html)。
 * 現状（podcasts ~700 件 / episodes ~2000 件 / users 数十件）は十分余裕があるが、
 * 将来 episodes が 10 万件オーダーに増えた場合は **sitemap index 化（分割）が必要**。
 * その際は本ファイルを sitemap index + 子 sitemap (例: `app/sitemap/podcasts/[page]/sitemap.ts`)
 * の構成に書き換える。
 *
 * ## URL の encode について
 *
 * `username` は `usernameSchema` でかなり厳しく制約されているため非 ASCII が
 * 含まれる可能性は低いが、念のため `encodeURIComponent` でエンコードする
 * （DAL 側の podcast/episode id も同じ流儀）。
 */

/**
 * BE 取得失敗時の Promise.allSettled の結果から items 配列を取り出す。
 * rejected なら空配列にフォールバックして警告ログを出す。
 */
function pickItems<T>(
  result: PromiseSettledResult<{ items: T[] }>,
  label: string,
): T[] {
  if (result.status === "fulfilled") return result.value.items;
  console.warn(
    `[sitemap] ${label} の取得に失敗しました。空配列にフォールバックします。`,
    result.reason,
  );
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  // ビルド時刻を静的 URL の lastModified に使う。動的 URL は BE の updated_at を使う。
  const buildTime = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified: buildTime,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${origin}/discover`,
      lastModified: buildTime,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${origin}/terms`,
      lastModified: buildTime,
      changeFrequency: "yearly",
      priority: 1.0,
    },
    {
      url: `${origin}/privacy`,
      lastModified: buildTime,
      changeFrequency: "yearly",
      priority: 1.0,
    },
  ];

  // 並列取得して総待ち時間を短縮。1 つでも失敗した場合に他を巻き込まないよう
  // `Promise.allSettled` を使う（個別 catch + 空配列フォールバック）。
  const [podcastsResult, episodesResult, usersResult] = await Promise.allSettled(
    [getSitemapPodcasts(), getSitemapEpisodes(), getSitemapUsers()],
  );

  const podcasts = pickItems(podcastsResult, "podcasts");
  const episodes = pickItems(episodesResult, "episodes");
  const users = pickItems(usersResult, "users");

  // BE が返す `updated_at` は `time.RFC3339` 形式の UTC 文字列（例:
  // "2026-04-01T00:00:00Z"）だが、`new Date(...)` を挟んで Next.js に正規化させる
  // ことで、将来 BE がローカル TZ 表記やマイクロ秒を返すように変わっても
  // sitemap.xml の `<lastmod>` 部分が壊れないようにしている（防御的）。
  const podcastEntries: MetadataRoute.Sitemap = podcasts.map((p) => ({
    url: `${origin}/podcasts/${encodeURIComponent(p.id)}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const episodeEntries: MetadataRoute.Sitemap = episodes.map((e) => ({
    url: `${origin}/episodes/${encodeURIComponent(e.id)}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const userEntries: MetadataRoute.Sitemap = users.map((u) => ({
    url: `${origin}/users/${encodeURIComponent(u.username)}`,
    lastModified: new Date(u.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...podcastEntries,
    ...episodeEntries,
    ...userEntries,
  ];
}
