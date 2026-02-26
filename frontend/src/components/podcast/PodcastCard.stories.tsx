import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PodcastCard from "./PodcastCard";

const meta = {
  title: "Podcast/PodcastCard",
  component: PodcastCard,
  tags: ["autodocs"],
} satisfies Meta<typeof PodcastCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    podcast: {
      id: "1",
      itunes_id: 123,
      title: "Rebuild",
      author: "Tatsuhiko Miyagawa",
      description: "A podcast about technology and more.",
      feed_url: null,
      artwork_url: null,
      itunes_url: null,
      genre: "テクノロジー",
      source_type: "itunes",
      source_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
};

export const NoGenre: Story = {
  args: {
    podcast: {
      id: "2",
      itunes_id: null,
      title: "ゆる言語学ラジオ",
      author: "ゆる言語学ラジオ",
      description: null,
      feed_url: null,
      artwork_url: null,
      itunes_url: null,
      genre: null,
      source_type: "itunes",
      source_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
};
