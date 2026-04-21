/**
 * Next.js の instrumentation フック。
 *
 * サーバープロセスの起動時に 1 回だけ呼ばれる `register()` と、
 * Server Component / Route Handler / Server Action / proxy.ts で発生した
 * 未処理エラーを捕捉する `onRequestError` フックを export する。
 *
 * 設計意図:
 * - `onRequestError = Sentry.captureRequestError` により、Server 側で throw された
 *   エラーは自動的に Sentry に送られる。このため、各 `error.tsx` で `useEffect`
 *   を使って `Sentry.captureException` を呼ぶ必要がない（Client Component で
 *   不要な副作用を増やさない設計）
 * - Client 側（ブラウザで発生した render エラー）は `ErrorBoundary.tsx` の
 *   `componentDidCatch` で捕捉する二段構え
 *
 * 参考: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *       https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
