import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PodcastSelectCard from "./PodcastSelectCard";

const meta = {
  title: "Podcast/PodcastSelectCard",
  component: PodcastSelectCard,
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
} satisfies Meta<typeof PodcastSelectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    podcast: {
      id: "pod-1",
      title: "お笑いラジオショー",
      author: "田中太郎",
      artwork_url: "https://picsum.photos/200",
      average_rating: 4.2,
      total_reviews: 15,
      favorite_count: 8,
    },
    onSelect: () => {},
  },
};

export const NoArtwork: Story = {
  args: {
    podcast: {
      id: "pod-2",
      title: "とても長い番組名が入る場合のテストケース",
      author: "配信者名がとても長い場合のテスト",
      artwork_url: null,
      average_rating: 0,
      total_reviews: 0,
      favorite_count: 0,
    },
    onSelect: () => {},
  },
};

export const NoAuthor: Story = {
  args: {
    podcast: {
      id: "pod-3",
      title: "配信者なし番組",
      author: null,
      artwork_url: null,
      average_rating: 3.5,
      total_reviews: 5,
      favorite_count: 2,
    },
    onSelect: () => {},
  },
};
