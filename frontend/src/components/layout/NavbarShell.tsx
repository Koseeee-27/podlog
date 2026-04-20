import Image from "next/image";
import Link from "next/link";

/**
 * `Navbar` の Suspense fallback 兼 ErrorBoundary fallback。
 *
 * 目的:
 * - `(main)/layout.tsx` から `getViewer()` の直接 `await` を外すための
 *   プレースホルダー。認証解決が終わるまでの間 (`mode="loading"`)、もしくは
 *   `getViewer()` が 500 等で失敗したとき (`mode="error"`) に `Navbar` の
 *   代わりに表示される。
 * - ロゴは `Navbar` と同じ位置に描画して、`Navbar` への切り替え時にチラつきを
 *   抑える。検索バーは **非インタラクティブなプレースホルダー** (disabled
 *   input) で見た目だけ再現する (詳細は下記「検索バーの扱い」を参照)。
 * - 右端のアクションボタン (`ログイン` / `＋ 記録する` / アバター) の代わりに
 *   固定幅のスケルトンを置き、レイアウトシフト (CLS) を防ぐ。
 *
 * 注意:
 * - **Server Component として提供する** (`"use client"` を付けない)。
 *   子要素もすべて静的な HTML で、Client Component は含めない
 *   (下記「検索バーの扱い」参照)。
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
 * - `mode` は a11y 文言の切り替え専用。`loading` のとき `role="status"` +
 *   `aria-live="polite"` でスクリーンリーダーに「読み込み中」と伝える。
 *   `error` のときはこれらを外す (永続的な状態なので live region は不適切)。
 *   見た目は `loading` / `error` で同一。
 *
 * 検索バーの扱い:
 * fallback と本体 (`Navbar`) の両方で同じ Client Component (`NavbarSearchForm`)
 * を描画すると、React は **別ツリーのインスタンス** として扱うため、Suspense
 * 解決時に fallback がアンマウント → 本体がマウントされる瞬間に `useState` の
 * 入力値とフォーカスが失われる (認証解決を待たずに入力したユーザーの文字列が
 * 消える UX バグになる)。これを防ぐため `NavbarShell` では `NavbarSearchForm`
 * を使わず、**disabled な input** で見た目だけを再現する。副次効果として:
 * - 認証解決中は検索できないが、通常 100〜500ms で解決するため影響は軽微
 * - `aria-hidden="true"` でスクリーンリーダーからも隠し、`Navbar` 解決後に
 *   本物の検索フォームが登場したことをユーザーに知らせる
 * - 本質的な解決 (ロゴ / 検索バーを Suspense の外に出してインスタンスを
 *   共有する構造変更) は別 Issue で検討する
 */
interface NavbarShellProps {
  /**
   * Suspense fallback (認証解決待ち) と ErrorBoundary fallback (エラー確定)
   * で a11y 属性を切り替えるためのフラグ。デフォルトは `"loading"`。
   */
  mode?: "loading" | "error";
}

export default function NavbarShell({ mode = "loading" }: NavbarShellProps) {
  const isLoading = mode === "loading";

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

            {/* 中央: 検索バーのプレースホルダー (非インタラクティブ)。
                本体の `NavbarSearchForm` (Client Component, useState) と**別の**
                React インスタンスになるため、Suspense 解決時にユーザー入力・
                フォーカスが失われる問題を避けるため、ここでは disabled な
                input で見た目だけ再現する。`aria-hidden="true"` で SR からも
                隠し、`Navbar` 解決後の本物の検索フォーム登場時に改めて案内する。 */}
            <div className="flex-1 max-w-md" aria-hidden="true">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="search"
                  placeholder="番組を検索..."
                  disabled
                  tabIndex={-1}
                  className="w-full rounded-lg border border-stone-200 bg-stone-100 py-1.5 pl-9 pr-3 text-sm text-stone-400 placeholder:text-stone-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* 右: アクションボタンのスケルトン。
                `loading` のときだけ `role="status"` + `aria-live="polite"` を
                付けてスクリーンリーダーに読み込み中と案内する。live region は
                **内部のテキストノードの変化** をもとにアナウンスされる仕様なので、
                `aria-label` ではなく `sr-only` な実テキストを埋め込む (NVDA /
                JAWS / VoiceOver 全てで確実に通知されるようにするため)。
                `error` のときは永続状態なので live region を外し、誤案内を防ぐ。 */}
            <div
              className="flex items-center gap-2 shrink-0"
              {...(isLoading
                ? {
                    role: "status",
                    "aria-live": "polite" as const,
                  }
                : {})}
            >
              {isLoading && (
                <span className="sr-only">ナビゲーションを読み込み中</span>
              )}
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
