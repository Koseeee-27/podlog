import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BottomNav from "./BottomNav";
import type { User } from "@/types/user";

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
      <div className="block sm:block">
        <style>{`
          nav.sm\\:hidden { display: block !important; position: relative !important; }
        `}</style>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProfile: User = {
  id: "u1",
  username: "tanaka",
  display_name: "田中太郎",
  avatar_url: null,
  bio: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  is_admin: false,
};

export const Authenticated: Story = {
  args: {
    viewer: { status: "authenticated", profile: mockProfile },
  },
};

export const Guest: Story = {
  args: {
    viewer: { status: "guest" },
  },
};

export const NoProfile: Story = {
  args: {
    viewer: { status: "no_profile" },
  },
};
