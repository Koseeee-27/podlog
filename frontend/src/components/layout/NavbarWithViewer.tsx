import Navbar from "./Navbar";
import { getViewer } from "@/lib/auth/getViewer";

/**
 * `Navbar` に現在の閲覧者を注入する async Server Component。
 *
 * `(main)/layout.tsx` から `getViewer()` の直接 `await` を外し、ここに
 * 切り出すことで、以下の挙動になる:
 *
 * - **layout は同期 Server Component のまま**。配下のページが個別に
 *   Static / Dynamic を選択できる (layout から Dynamic が強制伝播しない)。
 * - **認証解決の間は `<Suspense fallback={<NavbarShell />}>` が担当**。
 *   ロゴ・検索バーは即座に描画され、右端ボタンだけスケルトンになる。
 * - **500 等の予期しないエラーは throw して ErrorBoundary に委ねる**。
 *   `getViewer()` は 401/404 を判別 union に変換するため、ここで
 *   catch が必要なのは 500 系のみ。呼び出し側の layout で
 *   `<ErrorBoundary fallback={<NavbarShell />}>` により guest 相当の
 *   見た目にフォールバックする。
 *   エラーログは `ErrorBoundary` 側の `componentDidCatch` が
 *   `console.error` + componentStack を出力するため、ここでは重ねない。
 * - 本体コンテンツ (`main` 要素の children) は Suspense の外側にあるため、
 *   ナビの認証解決を待たずにストリーミング描画される。
 *
 * Storybook について:
 * 本コンポーネントは `getViewer()` (DAL) を呼んで `<Navbar viewer={viewer} />`
 * に渡すだけの薄いラッパーで独自の描画ロジックを持たないため、専用 story は
 * 設けていない。viewer の各状態 (guest / no_profile / authenticated) の
 * 見た目バリエーションは `Navbar` 側で (story 追加時に) カバーする想定。
 * ローディング / エラー時の fallback は `NavbarShell.stories.tsx` を参照。
 */
export default async function NavbarWithViewer() {
  const viewer = await getViewer();
  return <Navbar viewer={viewer} />;
}
