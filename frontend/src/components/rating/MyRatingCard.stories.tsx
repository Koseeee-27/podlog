import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MyRatingCard from "./MyRatingCard";

const meta = {
  title: "Rating/MyRatingCard",
  component: MyRatingCard,
  tags: ["autodocs"],
} satisfies Meta<typeof MyRatingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseRating = {
  id: "r1",
  user_id: "u1",
  episode_id: "e1",
  rating: 4,
  created_at: "2026-03-10T12:00:00Z",
  updated_at: "2026-03-10T12:00:00Z",
};

export const Default: Story = {
  args: {
    rating: baseRating,
    onEdit: () => {},
    onStartDelete: () => {},
    confirmDelete: false,
    onConfirmDelete: () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};

export const ConfirmingDelete: Story = {
  args: {
    rating: baseRating,
    onEdit: () => {},
    onStartDelete: () => {},
    confirmDelete: true,
    onConfirmDelete: () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};

export const Deleting: Story = {
  args: {
    rating: baseRating,
    onEdit: () => {},
    onStartDelete: () => {},
    confirmDelete: true,
    onConfirmDelete: () => {},
    onCancelDelete: () => {},
    actionLoading: true,
  },
};

export const FiveStars: Story = {
  args: {
    rating: { ...baseRating, rating: 5 },
    onEdit: () => {},
    onStartDelete: () => {},
    confirmDelete: false,
    onConfirmDelete: () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};
