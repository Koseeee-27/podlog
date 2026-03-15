import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import UserFavoritePodcasts from "./UserFavoritePodcasts";

const meta = {
  title: "Profile/UserFavoritePodcasts",
  component: UserFavoritePodcasts,
  tags: ["autodocs"],
} satisfies Meta<typeof UserFavoritePodcasts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPodcasts: Story = {
  args: {
    loading: false,
    podcasts: [
      { id: "p1", title: "オールナイトニッポン", artwork_url: "https://placehold.co/64x64" },
      { id: "p2", title: "JUNK", artwork_url: "https://placehold.co/64x64" },
      { id: "p3", title: "ラジオの時間" },
    ],
  },
};

export const Empty: Story = {
  args: {
    loading: false,
    podcasts: [],
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    podcasts: [],
  },
};
