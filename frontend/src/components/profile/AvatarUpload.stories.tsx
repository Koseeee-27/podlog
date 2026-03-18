import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AvatarUpload from "./AvatarUpload";

const meta = {
  title: "Profile/AvatarUpload",
  component: AvatarUpload,
  tags: ["autodocs"],
} satisfies Meta<typeof AvatarUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAvatar: Story = {
  args: {
    currentAvatarUrl: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/dummy/96x96.jpg",
    displayName: "コウセイ",
    onUploadComplete: () => {},
    onError: () => {},
  },
};

export const WithoutAvatar: Story = {
  args: {
    currentAvatarUrl: null,
    displayName: "コウセイ",
    onUploadComplete: () => {},
    onError: () => {},
  },
};
