import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NavbarShell from "./NavbarShell";

/**
 * `NavbarShell` は `(main)/layout.tsx` で `<Navbar />` の認証解決を待つ間、
 * もしくは `getViewer()` がエラーになったときに表示する fallback コンポーネント。
 * PC ヘッダーと SP ボトムナビ双方のプレースホルダーを含む。
 *
 * `mode` prop で a11y と視覚挙動を切り替える:
 * - `loading`: `role="status" aria-live="polite"` で「読み込み中」と案内し、
 *   右端スケルトンを `animate-pulse` で揺らす
 * - `error`: live region を外し、アニメーションも停止 (永続状態で「読み込み中」
 *   に見せないため)
 */
const meta = {
  title: "Layout/NavbarShell",
  component: NavbarShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NavbarShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Suspense fallback として使うときのデフォルト状態 (デスクトップ幅)。
 * 右端スケルトンは `role="status" aria-live="polite"` 付き。
 */
export const LoadingDesktop: Story = {
  args: { mode: "loading" },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

/**
 * Suspense fallback として使うときのモバイル表示。
 * PC ヘッダーは `hidden sm:block` で非表示、画面下部の SP ボトムナビ
 * プレースホルダー (`h-14` の空領域) が表示される。
 */
export const LoadingMobile: Story = {
  args: { mode: "loading" },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

/**
 * ErrorBoundary fallback として使うときのデスクトップ表示。
 * 右端スケルトンのアニメーションを止め (永続状態なので「読み込み中」に見せ
 * ない)、`role="status"` / `aria-live` も外してスクリーンリーダーに誤案内
 * しないようにする。
 */
export const ErrorDesktop: Story = {
  args: { mode: "error" },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

/**
 * ErrorBoundary fallback のモバイル表示。
 */
export const ErrorMobile: Story = {
  args: { mode: "error" },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
