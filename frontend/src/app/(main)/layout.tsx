import { Suspense } from "react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import NavbarShell from "@/components/layout/NavbarShell";
import NavbarWithViewer from "@/components/layout/NavbarWithViewer";

/**
 * `(main)` グループ全体のレイアウト。
 *
 * 設計の要点:
 * - **layout 自身は同期 Server Component** に保つ。ここで `await getViewer()` を
 *   直接呼ぶと、`getViewer()` が内部で `cookies()` を使うため配下の全ルートが
 *   Dynamic に強制される。結果として `(main)/page.tsx` (トップページ) を
 *   Static 化する、といった最適化ができなくなる。
 * - 認証依存のナビは `<NavbarWithViewer />` (async SC) に切り出し、
 *   `<Suspense fallback={<NavbarShell />}>` で囲む。これにより:
 *     - layout からの Dynamic 伝播が止まる
 *     - 認証解決中はロゴ・検索バーが即座に描画され、右端だけスケルトン
 *     - 本体コンテンツ (`main` 配下) は認証解決を待たずにストリーミング
 * - `getViewer()` が 500 を throw した場合に layout 配下の全ページが
 *   `error.tsx` に飛ぶのを防ぐため、さらに `<ErrorBoundary>` で囲む。
 *   fallback は `<NavbarShell />` (guest 相当の見た目) を再利用し、本体の
 *   描画を継続させる。保護ページでは `page.tsx` 側の `getMyProfile()` catch
 *   (保護ページ統一テンプレート) が 401/403/404 を個別に処理する。
 * - `ErrorBoundary` は `"use client"` の Client Component だが、`fallback`
 *   prop に Server Component (`<NavbarShell />`) の JSX を渡すのは Next.js の
 *   標準パターンで問題ない (SC は RSC ペイロードとしてシリアライズされて渡る)。
 *   ただし `NavbarShell` 内部で Server Action を直接呼ぶ実装を追加するのは
 *   避けること (Client 境界を越えた呼び出しになる)。
 *
 * 参考: `.claude/rules/frontend.md` の「Suspense / ストリーミング」セクション。
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <ErrorBoundary fallback={<NavbarShell />}>
        <Suspense fallback={<NavbarShell />}>
          <NavbarWithViewer />
        </Suspense>
      </ErrorBoundary>
      <main className="max-w-5xl mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
    </div>
  );
}
