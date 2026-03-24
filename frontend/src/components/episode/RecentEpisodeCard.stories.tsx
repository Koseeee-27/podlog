import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RecentEpisodeCard from "./RecentEpisodeCard";

const meta = {
  title: "Episode/RecentEpisodeCard",
  component: RecentEpisodeCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecentEpisodeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    episode: {
      id: "ep-1",
      title: "#152 今週の面白かったニュースを語る回",
      description: "今週のニュースを振り返ります。",
      duration_ms: 3600000,
      published_at: "2026-03-20T00:00:00Z",
      podcast: {
        id: "pod-1",
        title: "お笑いラジオショー",
        artwork_url: "https://picsum.photos/200",
      },
    },
  },
};

export const NoArtwork: Story = {
  args: {
    episode: {
      id: "ep-2",
      title: "とても長いエピソードタイトルが入る場合のテスト。2行に折り返されることを確認する",
      description: null,
      duration_ms: 1800000,
      published_at: "2026-03-18T00:00:00Z",
      podcast: {
        id: "pod-2",
        title: "ポッドキャスト名がとても長い場合のテスト",
        artwork_url: null,
      },
    },
  },
};

export const NoPublishedAt: Story = {
  args: {
    episode: {
      id: "ep-3",
      title: "公開日なしのエピソード",
      description: null,
      duration_ms: null,
      published_at: null,
      podcast: {
        id: "pod-3",
        title: "テスト番組",
        artwork_url: null,
      },
    },
  },
};
