import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import UserListeningHistory from "./UserListeningHistory";

const meta = {
  title: "Profile/UserListeningHistory",
  component: UserListeningHistory,
  tags: ["autodocs"],
} satisfies Meta<typeof UserListeningHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRecords: Story = {
  args: {
    records: [
      {
        id: "lr1",
        episode: { id: "e1", title: "第100回 特別編", podcast_id: "p1" },
        podcast: { id: "p1", title: "オールナイトニッポン" },
        created_at: "2026-03-10T12:00:00Z",
      },
      {
        id: "lr2",
        episode: { id: "e2", title: "ゲスト回", podcast_id: "p2" },
        podcast: { id: "p2", title: "JUNK" },
        created_at: "2026-03-09T18:00:00Z",
      },
    ],
    total: 2,
    loading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Empty: Story = {
  args: {
    records: [],
    total: 0,
    loading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const HasMore: Story = {
  args: {
    records: [
      {
        id: "lr1",
        episode: { id: "e1", title: "第100回 特別編", podcast_id: "p1" },
        podcast: { id: "p1", title: "オールナイトニッポン" },
        created_at: "2026-03-10T12:00:00Z",
      },
    ],
    total: 20,
    loading: false,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const InitialLoading: Story = {
  args: {
    records: [],
    total: 0,
    loading: true,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Error: Story = {
  args: {
    records: [],
    total: 0,
    loading: false,
    error: "聴取履歴の取得に失敗しました",
    hasMore: false,
    onLoadMore: () => {},
  },
};
