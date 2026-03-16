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
      title: "Rebuild",
      author: "Tatsuhiko Miyagawa",
      artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/300x300.jpg",
      average_rating: 4.5,
      total_reviews: 12,
    },
  },
};

export const NoReviews: Story = {
  args: {
    podcast: {
      id: "2",
      title: "ゆる言語学ラジオ",
      author: "ゆる言語学ラジオ",
      artwork_url: null,
      average_rating: 0,
      total_reviews: 0,
    },
  },
};

export const NoArtwork: Story = {
  args: {
    podcast: {
      id: "3",
      title: "バイリンガルニュース",
      author: null,
      artwork_url: null,
      average_rating: 3.8,
      total_reviews: 5,
    },
  },
};
