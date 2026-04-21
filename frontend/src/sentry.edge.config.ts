/**
 * Sentry の Edge runtime 初期化。
 *
 * `src/instrumentation.ts` の `register()` から、
 * `process.env.NEXT_RUNTIME === "edge"` のときに動的 import される。
 *
 * Edge runtime は Next.js 16 では主に `proxy.ts`（旧 middleware.ts）で動く。
 * PodLog の `proxy.ts` は認証 Cookie を読んで保護パスを `/login` にリダイレクトするだけで、
 * 例外が発生することは稀だが、将来の Edge API Route 追加も見据えて init しておく。
 *
 * 設定方針は `sentry.server.config.ts` と同じく最小構成。
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV || "production",
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0,
});
