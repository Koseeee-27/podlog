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
  rating: 4,
  comment: "面白かった！また聴きたい。",
  created_at: "2026-03-10T12:00:00Z",
  updated_at: "2026-03-10T12:00:00Z",
};

export const Default: Story = {
  args: {
    review: baseReview,
    onEdit: () => {},
    onStartDelete: () => {},
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
    onStartDelete: () => {},
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
    onStartDelete: () => {},
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
    onStartDelete: () => {},
    confirmDelete: false,
    onConfirmDelete: async () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};
