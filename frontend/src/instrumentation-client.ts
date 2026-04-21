/**
 * Sentry のクライアントサイド（ブラウザ）初期化。
 *
 * Next.js 16 / Sentry SDK v10 では、ブラウザ側 init ファイルの規約名が
 * `sentry.client.config.ts` → `instrumentation-client.ts` に変更されている。
 * 参考: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 *
 * 設計方針:
 * - Developer 無料枠（5,000 events/月）を温存するため、Session Replay /
 *   Performance Monitoring は初期は無効化（必要になったら個別 Issue で有効化を検討）
 * - 本番環境のみ送信: Netlify の Deploy Preview は `NODE_ENV === "production"` で
 *   ビルドされるため、`NODE_ENV` だけで判定すると preview のエラーまで無料枠を消費する。
 *   `NEXT_PUBLIC_SENTRY_ENV === "production"` と AND を取り、preview では no-op にする
 * - `captureRouterTransitionStart` は App Router のナビゲーション計測用。
 *   tracesSampleRate: 0 なので実質呼ばれないが、将来 Performance を有効化したときに
 *   即座に動くよう export しておく（Next.js 16 + Sentry v10 推奨）
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV || "production",
  enabled:
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SENTRY_ENV === "production",
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
