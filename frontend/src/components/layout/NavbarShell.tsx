import Image from "next/image";
import Link from "next/link";
import NavbarSearchForm from "./NavbarSearchForm";

/**
 * `Navbar` の Suspense fallback 兼 ErrorBoundary fallback。
 *
 * 目的:
 * - `(main)/layout.tsx` から `getViewer()` の直接 `await` を外すための
 *   プレースホルダー。認証解決が終わるまでの間、もしくは `getViewer()` が
 *   500 等で失敗したときに `Navbar` の代わりに表示される。
 * - ロゴ / 検索バーのような「認証状態に依存しない静的部分」は `Navbar` と
 *   同じ位置に描画して、`Navbar` への切り替え時にチラつきを抑える。
 * - 右端のアクションボタン (`ログイン` / `＋ 記録する` / アバター) の代わりに
 *   固定幅のスケルトンを置き、レイアウトシフト (CLS) を防ぐ。
 *
 * 注意:
 * - **Server Component として提供する** (`"use client"` を付けない)。
 *   内部で使っている `NavbarSearchForm` は Client Component だが、
 *   Server Component の JSX に Client Component を埋めるのは問題ない。
 * - スケルトン幅は `w-20 h-8` (80×32px)。guest 時のログインボタン
 *   (`px-4 py-1.5 text-sm` ≒ 70-80px) とほぼ一致する一方、ログイン済み時の
 *   「＋ 記録する」+ アバター (合計約 140px) とは 60px ほどズレる。つまり
 *   **ログイン済みユーザーのフルリロード時は右側が伸びる方向にシフトする**。
 *   アプリ内遷移 (Link クリック) では layout が再実行されないためチラつき
 *   はゼロ。フルリロードは頻度が低いため、この挙動は許容する。
 * - エラー fallback としても使うため「guest 相当の見た目」に倒している
 *   (右端はスケルトン表示で、ログインボタンは出さない)。フルリロードで
 *   `getViewer()` が 500 を返したケースは稀なため、明示的な「再試行」UI
 *   は出さずに ErrorBoundary の挙動に任せる。
 */
export default function NavbarShell() {
  return (
    <>
      {/* PC ヘッダー */}
      <nav
        className="hidden sm:block bg-white border-b border-stone-200 sticky top-0 z-40"
        aria-label="メインナビゲーション"
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* 左: ロゴ (認証非依存、即時描画) */}
            <Link href="/" className="shrink-0">
              <Image
                src="/logo-horizontal.png"
                alt="PodLog"
                width={120}
                height={28}
                priority
              />
            </Link>

            {/* 中央: 検索バー (認証非依存、即時描画) */}
            <NavbarSearchForm />

            {/* 右: アクションボタンのスケルトン (認証解決待ち)。
                `role="status"` + `aria-live="polite"` でスクリーンリーダーに
                「読み込み中」であることを伝える。 */}
            <div
              className="flex items-center gap-2 shrink-0"
              role="status"
              aria-live="polite"
              aria-label="ナビゲーションを読み込み中"
            >
              <div
                className="w-20 h-8 rounded-lg bg-stone-200 animate-pulse"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* SP ボトムナビのプレースホルダー:
          `BottomNav` と同じ `h-14` + safe-area padding を確保して、
          本体コンテンツ側の `pb-[calc(5rem+env(safe-area-inset-bottom))]` に
          合わせた空白を維持する。アイコン表示はしない (認証状態によって
          最後のタブが「ログイン / プロフィール設定 / マイページ」と変わる
          ため、確定していない状態では何も出さない方が誤誘導を防げる)。
          なお `BottomNav` 側の `isLoading` 廃止・`viewer` props 化と合わせて、
          SP/PC のスケルトン方針統一は別 Issue で再検討予定。 */}
      <nav
        aria-hidden="true"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="h-14" />
      </nav>
    </>
  );
}
