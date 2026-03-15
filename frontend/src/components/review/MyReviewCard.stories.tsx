import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MyReviewCard from "./MyReviewCard";

const meta = {
  title: "Review/MyReviewCard",
  component: MyReviewCard,
  tags: ["autodocs"],
} satisfies Meta<typeof MyReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseReview = {
  id: "r1",
  user: {
    id: "u1",
    username: "tanaka",
    display_name: "田中太郎",
  },
  rating: 4,
  comment: "面白かった！また聴きたい。",
  created_at: "2026-03-10T12:00:00Z",
};

export const Default: Story = {
  args: {
    review: baseReview,
    onEdit: () => {},
    onDelete: () => {},
    confirmDelete: false,
    onConfirmDelete: async () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};

export const ConfirmingDelete: Story = {
  args: {
    review: baseReview,
    onEdit: () => {},
    onDelete: () => {},
    confirmDelete: true,
    onConfirmDelete: async () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};

export const Deleting: Story = {
  args: {
    review: baseReview,
    onEdit: () => {},
    onDelete: () => {},
    confirmDelete: true,
    onConfirmDelete: async () => {},
    onCancelDelete: () => {},
    actionLoading: true,
  },
};

export const WithoutComment: Story = {
  args: {
    review: { ...baseReview, comment: undefined },
    onEdit: () => {},
    onDelete: () => {},
    confirmDelete: false,
    onConfirmDelete: async () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};
