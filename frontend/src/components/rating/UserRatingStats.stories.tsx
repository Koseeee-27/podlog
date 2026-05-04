import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import UserRatingStats from "./UserRatingStats";

const meta = {
  title: "Rating/UserRatingStats",
  component: UserRatingStats,
  tags: ["autodocs"],
} satisfies Meta<typeof UserRatingStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 評価あり: 「N 件評価 / 平均 ★X.X」表示 */
export const WithRatings: Story = {
  args: {
    totalRatings: 53,
    averageRating: 4.2,
  },
};

/** 高評価寄り: 平均値が高い */
export const HighAverage: Story = {
  args: {
    totalRatings: 120,
    averageRating: 4.8,
  },
};

/** 低評価寄り */
export const LowAverage: Story = {
  args: {
    totalRatings: 8,
    averageRating: 2.3,
  },
};

/** 評価ゼロ件: 「まだ評価がありません」表示 (screens.md L744) */
export const NoRatings: Story = {
  args: {
    totalRatings: 0,
    averageRating: 0,
  },
};
