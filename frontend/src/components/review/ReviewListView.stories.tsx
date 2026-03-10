import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewListView from "./ReviewListView";

const meta = {
  title: "Review/ReviewList",
  component: ReviewListView,
  tags: ["autodocs"],
} satisfies Meta<typeof ReviewListView>;

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
        rating: 4,
        created_at: "2026-03-02T18:00:00Z",
      },
      {
        id: "r3",
        user: { id: "u3", username: "yamada", display_name: "山田一郎" },
        rating: 3,
        comment: "普通でした。",
        created_at: "2026-03-03T09:00:00Z",
      },
    ],
    total: 3,
    averageRating: 4.0,
    loading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Empty: Story = {
  args: {
    reviews: [],
    total: 0,
    averageRating: 0,
    loading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const HasMore: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        user: { id: "u1", username: "tanaka", display_name: "田中太郎" },
        rating: 5,
        comment: "最高！",
        created_at: "2026-03-01T12:00:00Z",
      },
    ],
    total: 25,
    averageRating: 4.2,
    loading: false,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const LoadingMore: Story = {
  args: {
    reviews: [
      {
        id: "r1",
        user: { id: "u1", username: "tanaka", display_name: "田中太郎" },
        rating: 5,
        comment: "最高！",
        created_at: "2026-03-01T12:00:00Z",
      },
    ],
    total: 25,
    averageRating: 4.2,
    loading: true,
    hasMore: true,
    onLoadMore: () => {},
  },
};
