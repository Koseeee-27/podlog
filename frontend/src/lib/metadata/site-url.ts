/**
 * `NEXT_PUBLIC_SITE_URL` を解決する共通ヘルパー。
 *
 * `app/layout.tsx` の `metadataBase`、`app/robots.ts` の sitemap URL、
 * `app/sitemap.ts` の各 URL の origin など、複数の場所で同じ環境変数を
 * 参照する必要があるため、防御的実装をここに集約する。
 *
 * ## 設計方針
 *
 * - **trim + try/catch + production 時の `console.warn`** で、空文字や
 *   不正な URL でモジュール初期化が落ちるのを防ぎつつ、設定漏れに気づける
 *   運用にする（rules/frontend.md「`NEXT_PUBLIC_SITE_URL` と `metadataBase`」
 *   セクション参照）
 * - 黙ってフォールバックすると **本番環境で canonical / og:image / sitemap
 *   の各 URL が `localhost` のまま流出する事故**が起きる。`NODE_ENV ===
 *   "production"` のときに警告を出して気づきやすくする
 *
 * ### Sentry の有効化判定との違い（意図的）
 *
 * `frontend.md` の「環境別 Sentry 有効化判定」は
 * `NODE_ENV === "production" && NEXT_PUBLIC_SENTRY_ENV === "production"`
 * の AND 判定で Netlify Deploy Preview を**除外**する（無料枠消費を防ぐため）。
 * 一方、本ヘルパーの警告は `NODE_ENV` 単独で判定し、**Production と Preview の
 * 両方**で警告を出す。これは:
 *
 * - `.env.local.example` の運用方針として、Netlify Production / Deploy Preview
 *   の両方で `NEXT_PUBLIC_SITE_URL` を**別々に設定する必須要件**である
 * - Preview ビルドで未設定のまま SNS スクレイパが localhost の og:image /
 *   canonical を拾うと、外部に localhost URL が流出する事故になる
 * - 警告は単なる `console.warn`（無害）で、Preview でも設定漏れを検知できる
 *   ようにしておきたい
 *
 * という運用上の理由で、Sentry のパターンを敢えて流用していない。
 *
 * ### scheme なし入力への補完について
 *
 * 「scheme なし入力（例: `"example.com"`）に `https://` を補完する案」は
 * 採用しない。暗黙の挙動でドメイン typo (`typo.com` 等) を隠す副作用が
 * 危険なため、`console.warn` でフェイルする運用に揃える。
 */

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * 共通の警告ログを出す。
 *
 * `NODE_ENV === "production"` のときに出力する。これは **Netlify Production と
 * Deploy Preview の両方**を含む（どちらも NODE_ENV=production でビルドされる）。
 * Sentry の AND 判定とは異なる（モジュールの設計方針コメント参照）。
 */
function warnIfProduction(message: string): void {
  if (process.env.NODE_ENV === "production") {
    console.warn(message);
  }
}

/**
 * `NEXT_PUBLIC_SITE_URL` をパースして `URL` オブジェクトを返す。
 *
 * `metadataBase` のように `URL` インスタンスを必要とする箇所で使う。
 * 不正値・空文字のときは `http://localhost:3000` にフォールバックし、
 * production ビルド時のみ `console.warn` を出す。
 */
export function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    warnIfProduction(
      `[site-url] NEXT_PUBLIC_SITE_URL が未設定です。デフォルトの ${DEFAULT_SITE_URL} を使用します。Netlify の環境変数を確認してください。`,
    );
    return new URL(DEFAULT_SITE_URL);
  }
  try {
    return new URL(raw);
  } catch {
    warnIfProduction(
      `[site-url] NEXT_PUBLIC_SITE_URL が不正な URL です: "${raw}"。デフォルトの ${DEFAULT_SITE_URL} を使用します。`,
    );
    return new URL(DEFAULT_SITE_URL);
  }
}

/**
 * `NEXT_PUBLIC_SITE_URL` の origin（`scheme://host[:port]`）を文字列で返す。
 *
 * `app/robots.ts` / `app/sitemap.ts` のように
 * `${origin}/path` の形で URL を組み立てる箇所で使う。
 *
 * 末尾スラッシュや余計なパス・クエリ・フラグメントが入っていても
 * `URL.origin` で正規化される。
 */
export function getSiteOrigin(): string {
  return resolveMetadataBase().origin;
}
