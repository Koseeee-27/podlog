/**
 * Sentry のサーバーサイド（Node.js runtime）初期化。
 *
 * `src/instrumentation.ts` の `register()` から、
 * `process.env.NEXT_RUNTIME === "nodejs"` のときに動的 import される。
 *
 * 設計方針:
 * - Developer 無料枠（5,000 events/月）を FE に全振りするため、
 *   Performance Monitoring / Session Replay は明示的に `tracesSampleRate: 0` で無効化
 * - 本番環境のみ送信: Netlify の Deploy Preview は `NODE_ENV === "production"` で
 *   ビルドされるため、`NEXT_PUBLIC_SENTRY_ENV === "production"` との AND で preview を除外
 * - DSN は `NEXT_PUBLIC_SENTRY_DSN` を参照（Client/Server で同じ DSN を使う前提。
 *   `NEXT_PUBLIC_` 付きでも Server 側 process.env から読める）。PodLog では 1 プロジェクト
 *   1 DSN で運用するため分離しない
 * - DSN が未設定の場合、Sentry SDK は no-op として動作する（本 PR 時点では DSN 未発行のため）
 */
import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";
const sentryEnv = process.env.NEXT_PUBLIC_SENTRY_ENV;

// Production ビルドで NEXT_PUBLIC_SENTRY_ENV が "production" 以外のとき、Sentry は
// サイレントに無効化される。運用上の設定漏れ（Netlify 環境変数の入れ忘れ等）に
// ログストリームで気づけるよう、警告を 1 回だけ出す。preview コンテキストでの
// 意図的な無効化では警告を出さない（`NEXT_PUBLIC_SENTRY_ENV=preview` は OK）。
if (isProd && !sentryEnv) {
  console.warn(
    "[sentry] NEXT_PUBLIC_SENTRY_ENV is not set in a production build. " +
      "Sentry will be disabled. Check deploy environment variables."
  );
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnv || "production",
  enabled: isProd && sentryEnv === "production",
  tracesSampleRate: 0,
});
