import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CommentList from "./CommentList";

const meta = {
  title: "Comment/CommentList",
  component: CommentList,
  tags: ["autodocs"],
} satisfies Meta<typeof CommentList>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleComments = [
  {
    id: "c1",
    user: { id: "u1", username: "tanaka", display_name: "田中太郎" },
    body: "今週も最高でした！",
    created_at: "2026-05-01T12:00:00Z",
    updated_at: "2026-05-01T12:00:00Z",
  },
  {
    id: "c2",
    user: {
      id: "u2",
      username: "suzuki",
      display_name: "鈴木花子",
      avatar_url: "https://i.pravatar.cc/100?img=5",
    },
    body: "前半のゲストトークが特に面白かった。次回も絶対聴きます。",
    created_at: "2026-05-02T18:00:00Z",
    updated_at: "2026-05-02T18:00:00Z",
  },
  {
    id: "c3",
    user: { id: "u3", username: "yamada" },
    body: "BGM が好みで、ながら聴きにちょうどいい。",
    created_at: "2026-05-03T09:00:00Z",
    updated_at: "2026-05-03T09:00:00Z",
  },
];

export const WithComments: Story = {
  args: {
    comments: sampleComments,
    total: sampleComments.length,
    loading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Empty: Story = {
  args: {
    comments: [],
    total: 0,
    loading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const HasMore: Story = {
  args: {
    comments: sampleComments,
    total: 42,
    loading: false,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const LoadingMore: Story = {
  args: {
    comments: sampleComments,
    total: 42,
    loading: true,
    hasMore: true,
    onLoadMore: () => {},
  },
};
