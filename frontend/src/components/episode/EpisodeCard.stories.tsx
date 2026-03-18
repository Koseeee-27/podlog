import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EpisodeCard from "./EpisodeCard";

const meta = {
  title: "Episode/EpisodeCard",
  component: EpisodeCard,
  tags: ["autodocs"],
} satisfies Meta<typeof EpisodeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    episode: {
      id: "1",
      title: "Episode 300: The Future of AI",
      description: "In this episode we discuss the future of artificial intelligence and its impact on society.",
      duration_ms: 3600000,
      published_at: "2024-06-15T00:00:00Z",
      average_rating: 4.5,
      total_reviews: 12,
    },
  },
};

export const WithRating: Story = {
  args: {
    episode: {
      id: "2",
      title: "Episode 150: Deep Dive into TypeScript",
      description: "A comprehensive look at advanced TypeScript features and patterns.",
      duration_ms: 2700000,
      published_at: "2024-05-01T00:00:00Z",
      average_rating: 3.8,
      total_reviews: 5,
    },
  },
};

export const NoReviews: Story = {
  args: {
    episode: {
      id: "3",
      title: "Episode 1: Getting Started",
      description: null,
      duration_ms: null,
      published_at: null,
      average_rating: 0,
      total_reviews: 0,
    },
  },
};

export const MinimalInfo: Story = {
  args: {
    episode: {
      id: "4",
      title: "Episode 1",
      description: null,
      duration_ms: null,
      published_at: null,
      average_rating: 0,
      total_reviews: 0,
    },
  },
};
