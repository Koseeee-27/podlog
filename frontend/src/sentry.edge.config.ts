/**
 * Sentry の Edge runtime 初期化。
 *
 * `src/instrumentation.ts` の `register()` から、
 * `process.env.NEXT_RUNTIME === "edge"` のときに動的 import される。
 *
 * Edge runtime は Next.js 16 では主に middleware（現状 PodLog では `src/middleware.ts`。
 * 将来 `proxy.ts` にリネーム予定）で動く。認証 Cookie を読んで保護パスを `/login` に
 * リダイレクトするだけで例外が発生することは稀だが、将来の Edge API Route 追加も
 * 見据えて init しておく。
 *
 * 設定方針は `sentry.server.config.ts` と同じ（DSN の参照先、preview 除外、DSN 未設定時
 * no-op の扱いも同じ）。
 */
import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";
const sentryEnv = process.env.NEXT_PUBLIC_SENTRY_ENV;

// Production ビルドで NEXT_PUBLIC_SENTRY_ENV が未設定のとき警告を出す（詳細は
// sentry.server.config.ts の同等ロジック参照）。Edge runtime のログも Netlify /
// Cloud Run のログストリームに出るため、設定漏れ検知に活用できる。
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
