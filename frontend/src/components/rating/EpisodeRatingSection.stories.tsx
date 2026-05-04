import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/ui/Toast";
import EpisodeRatingSection from "./EpisodeRatingSection";

const meta = {
  title: "Rating/EpisodeRatingSection",
  component: EpisodeRatingSection,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof EpisodeRatingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseEpisodeId = "11111111-1111-1111-1111-111111111111";

const noRatings = {
  average_rating: 0,
  total_ratings: 0,
  distribution: {},
};

const someRatings = {
  average_rating: 4.2,
  total_ratings: 12,
  distribution: { "1": 0, "2": 1, "3": 2, "4": 3, "5": 6 },
};

const myRatingFour = {
  id: "rating-1",
  user_id: "user-1",
  episode_id: baseEpisodeId,
  rating: 4,
  created_at: "2026-04-10T12:00:00Z",
  updated_at: "2026-04-10T12:00:00Z",
};

/** 未ログイン: 「ログインして評価する」CTA ボタンが出る */
export const LoggedOut: Story = {
  args: {
    episodeId: baseEpisodeId,
    episodeStats: someRatings,
    myRating: null,
    isLoggedIn: false,
  },
};

/** ログイン済み + 自分の評価なし + 全体評価ゼロ: 新規投稿フォーム */
export const NotRatedYetNoRatings: Story = {
  args: {
    episodeId: baseEpisodeId,
    episodeStats: noRatings,
    myRating: null,
    isLoggedIn: true,
  },
};

/** ログイン済み + 自分の評価なし + 他者評価あり: 新規投稿フォーム + 平均評価表示 */
export const NotRatedYetWithOthers: Story = {
  args: {
    episodeId: baseEpisodeId,
    episodeStats: someRatings,
    myRating: null,
    isLoggedIn: true,
  },
};

/** ログイン済み + 自分が評価済み: MyRatingCard 表示 */
export const AlreadyRated: Story = {
  args: {
    episodeId: baseEpisodeId,
    episodeStats: someRatings,
    myRating: myRatingFour,
    isLoggedIn: true,
  },
};
