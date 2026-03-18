import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import FavoritePodcastEditor from "./FavoritePodcastEditor";

const meta = {
  title: "Profile/FavoritePodcastEditor",
  component: FavoritePodcastEditor,
  tags: ["autodocs"],
} satisfies Meta<typeof FavoritePodcastEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPodcasts: Story = {
  args: {
    podcasts: [
      { id: "p1", title: "オールナイトニッポン", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/64x64.jpg" },
      { id: "p2", title: "JUNK", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/64x64.jpg" },
      { id: "p3", title: "ラジオの時間" },
    ],
    onChange: () => {},
  },
};

export const Empty: Story = {
  args: {
    podcasts: [],
    onChange: () => {},
  },
};
