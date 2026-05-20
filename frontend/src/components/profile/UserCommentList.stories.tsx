import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import UserCommentList from "./UserCommentList";

const meta = {
  title: "Profile/UserCommentList",
  component: UserCommentList,
  tags: ["autodocs"],
} satisfies Meta<typeof UserCommentList>;

export default meta;
type Story = StoryObj<typeof meta>;

const sample = [
  {
    id: "c1",
    episode: {
      id: "e1",
      title: "第100回 特別編",
      podcast_id: "p1",
    },
    podcast: { id: "p1", title: "オールナイトニッポン" },
    body: "最高のエピソードでした！ゲストとの掛け合いがテンポよくて、笑いっぱなしの 1 時間でした。",
    created_at: "2026-03-10T12:00:00Z",
    updated_at: "2026-03-10T12:00:00Z",
  },
  {
    id: "c2",
    episode: { id: "e2", title: "ゲスト回", podcast_id: "p2" },
    podcast: { id: "p2", title: "JUNK" },
    body: "後半のフリートークが面白すぎた。",
    created_at: "2026-03-09T18:00:00Z",
    updated_at: "2026-03-09T18:00:00Z",
  },
];

export const WithComments: Story = {
  args: {
    comments: sample,
    total: sample.length,
    isPending: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Empty: Story = {
  args: {
    comments: [],
    total: 0,
    isPending: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const HasMore: Story = {
  args: {
    comments: sample,
    total: 42,
    isPending: false,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const LoadingMore: Story = {
  args: {
    comments: sample,
    total: 42,
    isPending: true,
    hasMore: true,
    onLoadMore: () => {},
  },
};
