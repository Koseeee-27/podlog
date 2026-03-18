import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PopularPodcastsSection from "./PopularPodcastsSection";

const meta = {
  title: "Home/PopularPodcastsSection",
  component: PopularPodcastsSection,
  tags: ["autodocs"],
} satisfies Meta<typeof PopularPodcastsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
