/**
 * Sentry のサーバーサイド（Node.js runtime）初期化。
 *
 * `src/instrumentation.ts` の `register()` から、
 * `process.env.NEXT_RUNTIME === "nodejs"` のときに動的 import される。
 *
 * 設計方針:
 * - Developer 無料枠（5,000 events/月）を FE に全振りするため、
 *   Performance Monitoring / Session Replay は無効化（v10 SDK のデフォルトは 0）
 * - 開発環境での誤送信を防ぐため `enabled: NODE_ENV === "production"` で絞る
 * - DSN が未設定の場合、Sentry SDK は no-op として動作する（本 PR 時点では DSN 未発行のため）
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV || "production",
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0,
});
