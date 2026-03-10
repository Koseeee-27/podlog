import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewCard from "./ReviewCard";

const meta = {
  title: "Review/ReviewCard",
  component: ReviewCard,
  tags: ["autodocs"],
} satisfies Meta<typeof ReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithComment: Story = {
  args: {
    review: {
      id: "r1",
      user: {
        id: "u1",
        username: "tanaka",
        display_name: "田中太郎",
      },
      rating: 5,
      comment: "最高のエピソードでした！毎週楽しみにしています。",
      created_at: "2026-03-01T12:00:00Z",
    },
  },
};

export const WithoutComment: Story = {
  args: {
    review: {
      id: "r2",
      user: {
        id: "u2",
        username: "suzuki",
        display_name: "鈴木花子",
      },
      rating: 3,
      created_at: "2026-03-05T18:30:00Z",
    },
  },
};

export const LowRating: Story = {
  args: {
    review: {
      id: "r3",
      user: {
        id: "u3",
        username: "yamada",
        display_name: "山田一郎",
      },
      rating: 1,
      comment: "期待外れでした。",
      created_at: "2026-03-08T09:00:00Z",
    },
  },
};
