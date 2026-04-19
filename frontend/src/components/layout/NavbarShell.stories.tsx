import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NavbarShell from "./NavbarShell";

/**
 * `NavbarShell` は `(main)/layout.tsx` で `<Navbar />` の認証解決を待つ間に
 * 表示する fallback コンポーネント。PC ヘッダーと SP ボトムナビ双方の
 * プレースホルダーを含む。
 *
 * このストーリーでは viewport を切り替えて PC / SP それぞれのレイアウトを
 * 目視確認する。右端のアクションボタンは `w-20 h-8` のスケルトンが表示され、
 * 実ボタン (「ログイン」等) との幅差が小さいことを確認する。
 */
const meta = {
  title: "layout/NavbarShell",
  component: NavbarShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NavbarShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デスクトップ幅での表示。ロゴ・検索バー・右端スケルトンが横並びで表示される。
 */
export const Desktop: Story = {
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
};

/**
 * モバイル幅での表示。PC ヘッダーは `hidden sm:block` で非表示、画面下部の
 * ボトムナビプレースホルダー (`h-14` の空領域) が表示される。
 */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
