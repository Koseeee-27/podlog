import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "is1-ssl.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "*.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

/**
 * Sentry の withSentryConfig で next.config.ts を wrap する。
 *
 * - `silent: !process.env.CI`: ローカル開発時のビルドログを静かにし、CI では表示する
 * - `widenClientFileUpload: true`: Client バンドル全体で Source Maps を有効化（将来の
 *   Source Maps アップロード時に効く。現 PR ではアップロード自体は行わない）
 * - `disableLogger: true`: Client バンドルから Sentry 内部の logger を落として
 *   バンドルサイズを数 KB 削る（無料枠全振り方針と整合）
 * - `tunnelRoute: "/monitoring"`: ブラウザ側の Sentry リクエストを自サイト経由にプロキシし、
 *   uBlock Origin などの adblocker にブロックされないようにする。PodLog の重要な KPI
 *   （エラー検知）をユーザーのブラウザ拡張に依存させない
 * - `org` / `project`: Sentry プロジェクト作成後に設定。未設定のままでも SDK は
 *   ランタイムでは no-op になる（DSN 未設定で enabled が効かないため）が、将来の
 *   Source Maps アップロード時には必須になる
 *
 * 参考: https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/
 */
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: "/monitoring",
});
