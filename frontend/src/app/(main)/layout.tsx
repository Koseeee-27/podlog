import Navbar from "@/components/layout/Navbar";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";

/**
 * `(main)` グループ全体のレイアウト。
 *
 * Server Component として `getViewer()` を 1 回だけ呼び、Navbar に
 * viewer を props で渡す。これにより子の page.tsx が同じリクエスト内で
 * `getViewer()` を呼んでも React の `cache()` により重複リクエストは発生
 * しない (同一リクエストスコープでメモ化される)。
 *
 * エラー処理について:
 * `getViewer()` は 500 等の予期しないエラーを throw する設計だが、
 * レイアウトで throw すると配下の **全ページ** が error.tsx に飛んでしまう
 * (公開ページのコンテンツまで巻き込まれる)。公開ページではナビゲーションが
 * 未ログイン扱いになるだけで本体は表示したいため、レイアウト側で catch
 * して `guest` にフォールバックする。
 *
 * 保護ページはそれぞれの `page.tsx` で `getMyProfile()` 等を呼んで
 * 401/403/404 を独自に扱う (保護ページ統一テンプレート) ため、ここで
 * guest にフォールバックしても最終的にリダイレクトされる。
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    // 500 等のサーバーエラー時はナビだけ未ログイン扱いにして本体の描画を続行。
    // 保護ページ側では page.tsx の `getMyProfile()` で再度エラーが投げられる
    // ため、認証必須画面でも適切なリダイレクト/エラーハンドリングが効く。
    viewer = { status: "guest" };
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar viewer={viewer} />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
    </div>
  );
}
