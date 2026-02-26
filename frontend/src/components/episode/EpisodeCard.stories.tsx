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
      podcast_id: "p1",
      itunes_track_id: null,
      title: "Episode 300: The Future of AI",
      description: "In this episode we discuss the future of artificial intelligence and its impact on society.",
      audio_url: null,
      artwork_url: null,
      source_url: null,
      duration_ms: 3600000,
      published_at: "2024-06-15T00:00:00Z",
      created_at: "2024-06-15T00:00:00Z",
      updated_at: "2024-06-15T00:00:00Z",
    },
  },
};

export const MinimalInfo: Story = {
  args: {
    episode: {
      id: "2",
      podcast_id: "p1",
      itunes_track_id: null,
      title: "Episode 1",
      description: null,
      audio_url: null,
      artwork_url: null,
      source_url: null,
      duration_ms: null,
      published_at: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
};
