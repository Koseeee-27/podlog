import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TimelineCard from "./TimelineCard";

const meta = {
  title: "Timeline/TimelineCard",
  component: TimelineCard,
  tags: ["autodocs"],
} satisfies Meta<typeof TimelineCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithArtwork: Story = {
  args: {
    item: {
      id: "t1",
      user: {
        id: "u1",
        username: "tanaka",
        display_name: "田中太郎",
      },
      episode: {
        id: "e1",
        title: "#300 AIの未来について語る回",
        podcast_id: "p1",
      },
      podcast: {
        id: "p1",
        title: "テック最前線",
        artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/300x300.jpg",
      },
      rating: 5,
      comment: "非常に興味深い内容でした。AIの将来について考えさせられます。",
      created_at: "2026-03-10T10:00:00Z",
    },
  },
};

export const WithoutArtwork: Story = {
  args: {
    item: {
      id: "t2",
      user: {
        id: "u2",
        username: "suzuki",
        display_name: "鈴木花子",
      },
      episode: {
        id: "e2",
        title: "霜降り明星のオールナイトニッポン #50",
        podcast_id: "p2",
      },
      podcast: {
        id: "p2",
        title: "霜降り明星のオールナイトニッポン",
      },
      rating: 4,
      created_at: "2026-03-09T22:00:00Z",
    },
  },
};

export const WithComment: Story = {
  args: {
    item: {
      id: "t3",
      user: {
        id: "u3",
        username: "yamada",
        display_name: "山田一郎",
      },
      episode: {
        id: "e3",
        title: "第1回 はじめまして",
        podcast_id: "p3",
      },
      podcast: {
        id: "p3",
        title: "はじめてのポッドキャスト",
      },
      rating: 2,
      comment: "内容が薄かった。",
      created_at: "2026-03-08T15:00:00Z",
    },
  },
};
