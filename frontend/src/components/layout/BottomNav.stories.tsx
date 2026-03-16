import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BottomNav from "./BottomNav";

const meta = {
  title: "Layout/BottomNav",
  component: BottomNav,
  tags: ["autodocs"],
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: "200px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProfile = {
  id: "u1",
  username: "tanaka",
  display_name: "田中太郎",
  avatar_url: null,
  bio: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const LoggedIn: Story = {
  args: {
    profile: mockProfile,
    isLoggedIn: true,
  },
};

export const NotLoggedIn: Story = {
  args: {
    profile: null,
    isLoggedIn: false,
  },
};
