import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TimelineCard from "./TimelineCard";

/**
 * 評価/感想分離（podlog-workspace#59）の P-8 で、`OldTimelineItem`（rating + comment）
 * 用 stories から `TimelineItem`（body のみ）用 stories に切替。
 */
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
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/300x300.jpg",
      },
      body: "非常に興味深い内容でした。AIの将来について考えさせられます。",
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
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
      body: "今週も最高でした！ゲストとの掛け合いがテンポよくて、笑いっぱなしの 1 時間でした。",
      created_at: "2026-03-09T22:00:00Z",
      updated_at: "2026-03-09T22:00:00Z",
    },
  },
};

/**
 * display_name が未設定（BE は omitempty で省略）のとき、username にフォールバック
 * することを確認する story。
 */
export const FallbackToUsername: Story = {
  args: {
    item: {
      id: "t3",
      user: {
        id: "u3",
        username: "yamada",
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
      body: "初回ながら聴きごたえがあった。次回も楽しみ。",
      created_at: "2026-03-08T15:00:00Z",
      updated_at: "2026-03-08T15:00:00Z",
    },
  },
};
