import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MyCommentCard from "./MyCommentCard";

const meta = {
  title: "Comment/MyCommentCard",
  component: MyCommentCard,
  tags: ["autodocs"],
} satisfies Meta<typeof MyCommentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseComment = {
  id: "c1",
  body: "面白かった！次回も絶対に聴く。",
  created_at: "2026-04-30T12:00:00Z",
  updated_at: "2026-04-30T12:00:00Z",
};

export const Default: Story = {
  args: {
    comment: baseComment,
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
    comment: baseComment,
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
    comment: baseComment,
    onEdit: () => {},
    onStartDelete: () => {},
    confirmDelete: true,
    onConfirmDelete: () => {},
    onCancelDelete: () => {},
    actionLoading: true,
  },
};

export const LongBody: Story = {
  args: {
    comment: {
      ...baseComment,
      body: "前半のゲストトークが特に面白かった！後半のリスナーメール紹介もテンポが良くて、一気に最後まで聴いてしまった。普段よりちょっと長めの回だったけど、まったく長さを感じさせない展開で、毎週聴く価値があるなとあらためて思った。",
    },
    onEdit: () => {},
    onStartDelete: () => {},
    confirmDelete: false,
    onConfirmDelete: () => {},
    onCancelDelete: () => {},
    actionLoading: false,
  },
};
