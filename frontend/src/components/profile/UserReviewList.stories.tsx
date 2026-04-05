import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import UserReviewList from "./UserReviewList";

const meta = {
  title: "Profile/UserReviewList",
  component: UserReviewList,
  tags: ["autodocs"],
} satisfies Meta<typeof UserReviewList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithReviews: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        episode: { id: "e1", title: "第100回 特別編", podcast_id: "p1" },
        podcast: { id: "p1", title: "オールナイトニッポン" },
        rating: 5,
        comment: "最高のエピソードでした！",
        created_at: "2026-03-10T12:00:00Z",
      },
      {
        id: "r2",
        episode: { id: "e2", title: "ゲスト回", podcast_id: "p2" },
        podcast: { id: "p2", title: "JUNK" },
        rating: 3,
        created_at: "2026-03-09T18:00:00Z",
      },
    ],
    total: 2,
    isPending: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Empty: Story = {
  args: {
    reviews: [],
    total: 0,
    isPending: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const HasMore: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        episode: { id: "e1", title: "第100回 特別編", podcast_id: "p1" },
        podcast: { id: "p1", title: "オールナイトニッポン" },
        rating: 5,
        comment: "最高のエピソードでした！",
        created_at: "2026-03-10T12:00:00Z",
      },
    ],
    total: 15,
    isPending: false,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const LoadingMore: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        episode: { id: "e1", title: "第100回 特別編", podcast_id: "p1" },
        podcast: { id: "p1", title: "オールナイトニッポン" },
        rating: 5,
        comment: "最高のエピソードでした！",
        created_at: "2026-03-10T12:00:00Z",
      },
    ],
    total: 15,
    isPending: true,
    hasMore: true,
    onLoadMore: () => {},
  },
};
