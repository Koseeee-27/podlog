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
      { id: "p1", title: "オールナイトニッポン", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/64x64.jpg" },
      { id: "p2", title: "JUNK", artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/64x64.jpg" },
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

export const Error: Story = {
  args: {
    loading: false,
    podcasts: [],
    error: "好きな番組の取得に失敗しました",
  },
};
