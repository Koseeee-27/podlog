import Navbar from "@/components/layout/Navbar";
import { getViewer } from "@/lib/auth/getViewer";

/**
 * `(main)` グループ全体のレイアウト。
 *
 * Server Component として `getViewer()` を 1 回だけ呼び、Navbar に
 * viewer を props で渡す。これにより子の page.tsx が同じリクエスト内で
 * `getViewer()` を呼んでも React の `cache()` により重複リクエストは発生
 * しない (同一リクエストスコープでメモ化される)。
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar viewer={viewer} />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
    </div>
  );
}
