import type { MetadataRoute } from "next";

/**
 * `app/robots.ts` は Next.js 16 の File Convention で
 * `https://<domain>/robots.txt` を動的に生成する。
 *
 * ## クロール方針
 *
 * - **本番環境** (`NEXT_PUBLIC_SENTRY_ENV === "production"`):
 *   全体は `allow: "/"`、ただし認証必須パス・内部ルートは `disallow` で個別除外
 * - **本番以外** (dev / Netlify Deploy Preview):
 *   `disallow: "/"` で全クロール拒否。Deploy Preview の URL が SNS スクレイパや
 *   検索エンジンに拾われて重複コンテンツ扱いされるのを防ぐ
 *
 * ## 環境判定について
 *
 * Sentry の有効化判定 (`NEXT_PUBLIC_SENTRY_ENV === "production"`) と同じ流儀。
 * Netlify の Deploy Preview は `NODE_ENV === "production"` でビルドされるため、
 * `NODE_ENV` だけで判定すると Preview でも本番扱いになりクロール許可が漏れる
 * (rules/frontend.md「環境別 Sentry 有効化判定」と同じ理由)。
 *
 * ## 認証必須パスの個別 disallow
 *
 * 各保護ページは `page.tsx` の `metadata.robots` で `index: false` を設定済みだが、
 * Googlebot は **クロールしたうえで noindex を読む**ため、disallow にしておくと
 * クロール自体を発生させずクロールバジェットを節約できる。
 * `/login` は page 側で noindex 済みであり、ログイン UI として外部リンクから
 * 到達されるユースケースがあるため robots.txt では allow のままにしている。
 *
 * 対象パス（Issue #378）:
 * - `/settings`, `/admin`, `/profile/setup`, `/record` — 認証必須ページ
 * - `/api`            — Next.js Route Handler（FE 内部用）
 * - `/monitoring`     — Sentry tunnel route（adblocker 回避経路）
 * - `/callback`       — OAuth コールバック（一時的なリダイレクト先）
 *
 * 新しい認証必須パスを増やすときは `screens.md` の indexable=N と
 * 本ファイルの `disallow` リストを同時に更新する。
 */
const PROTECTED_PATHS = [
  "/settings",
  "/admin",
  "/profile/setup",
  "/record",
  "/api",
  "/monitoring",
  "/callback",
] as const;

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * `NEXT_PUBLIC_SITE_URL` から sitemap の絶対 URL を組み立てる。
 *
 * trim + `new URL(...)` の try/catch で空文字 / 不正な URL でビルドが落ちないよう
 * 防御する（layout.tsx の `resolveMetadataBase` と同じ流儀）。`URL.origin` を使い
 * 末尾スラッシュやパス・クエリを取り除いた純粋な scheme://host[:port] を返すため、
 * `${origin}/sitemap.xml` の組み立てが安全になる。
 */
function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NEXT_PUBLIC_SENTRY_ENV === "production";
  const origin = getSiteOrigin();
  const sitemapUrl = `${origin}/sitemap.xml`;

  if (!isProduction) {
    // dev / Deploy Preview: 全 path を disallow。
    // sitemap も非公開にしておく（Preview の sitemap が外部に拾われないため）。
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  // 本番: 全体 allow + 認証必須パスを disallow + sitemap 明示。
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PROTECTED_PATHS],
      },
    ],
    sitemap: sitemapUrl,
  };
}
