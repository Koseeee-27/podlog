import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EpisodeReviewSectionView from "./EpisodeReviewSectionView";

const meta = {
  title: "Review/EpisodeReviewSection",
  component: EpisodeReviewSectionView,
  tags: ["autodocs"],
} satisfies Meta<typeof EpisodeReviewSectionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithReviews: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        user: { id: "u1", username: "tanaka", display_name: "田中太郎" },
        rating: 5,
        comment: "最高のエピソードでした！",
        created_at: "2026-03-01T12:00:00Z",
      },
      {
        id: "r2",
        user: { id: "u2", username: "suzuki", display_name: "鈴木花子" },
        rating: 3,
        created_at: "2026-03-02T18:00:00Z",
      },
    ],
    total: 2,
    averageRating: 4.0,
    listLoading: false,
    hasMore: false,
    onLoadMore: () => {},
    onSubmit: async () => {},
    actionLoading: false,
    submitted: false,
  },
};

export const Empty: Story = {
  args: {
    reviews: [],
    total: 0,
    averageRating: 0,
    listLoading: false,
    hasMore: false,
    onLoadMore: () => {},
    onSubmit: async () => {},
    actionLoading: false,
    submitted: false,
  },
};

export const Submitted: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        user: { id: "u1", username: "tanaka", display_name: "田中太郎" },
        rating: 5,
        comment: "投稿したレビュー",
        created_at: "2026-03-10T12:00:00Z",
      },
    ],
    total: 1,
    averageRating: 5.0,
    listLoading: false,
    hasMore: false,
    onLoadMore: () => {},
    onSubmit: async () => {},
    actionLoading: false,
    submitted: true,
  },
};
