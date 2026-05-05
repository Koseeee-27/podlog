import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CommentCard from "./CommentCard";

const meta = {
  title: "Comment/CommentCard",
  component: CommentCard,
  tags: ["autodocs"],
} satisfies Meta<typeof CommentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShortBody: Story = {
  args: {
    comment: {
      id: "c1",
      user: {
        id: "u1",
        username: "tanaka",
        display_name: "田中太郎",
      },
      body: "今週のエピソード最高でした！",
      created_at: "2026-04-30T12:00:00Z",
      updated_at: "2026-04-30T12:00:00Z",
    },
  },
};

export const LongBody: Story = {
  args: {
    comment: {
      id: "c2",
      user: {
        id: "u2",
        username: "suzuki",
        display_name: "鈴木花子",
        avatar_url: "https://i.pravatar.cc/100?img=5",
      },
      body: "前半のゲストトークも面白かったけれど、後半のリスナーメール紹介がとくに刺さった。共感ポイントが多くて、自分の生活と重ね合わせながら聴いていました。次回も絶対聴く！",
      created_at: "2026-05-01T18:30:00Z",
      updated_at: "2026-05-01T18:30:00Z",
    },
  },
};

export const WithoutDisplayName: Story = {
  args: {
    comment: {
      id: "c3",
      user: {
        id: "u3",
        username: "anonymous_listener",
        // display_name 未設定 → username が fallback で表示される
      },
      body: "BGM が好みで、ながら聴きにちょうどいい。",
      created_at: "2026-05-03T09:00:00Z",
      updated_at: "2026-05-03T09:00:00Z",
    },
  },
};
