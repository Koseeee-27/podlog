import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MobileNav from "./MobileNav";

const noop = () => {};
const asyncNoop = async () => {};

const meta = {
  title: "Layout/MobileNav",
  component: MobileNav,
  tags: ["autodocs"],
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    layout: "fullscreen",
  },
  args: {
    onClose: noop,
    onSignOut: asyncNoop,
  },
} satisfies Meta<typeof MobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProfile = {
  id: "user-1",
  username: "tanaka",
  display_name: "田中太郎",
  avatar_url: null,
  bio: "ラジオが好きです",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const LoggedIn: Story = {
  args: {
    open: true,
    profile: mockProfile,
    isLoggedIn: true,
    isLoading: false,
  },
};

export const NotLoggedIn: Story = {
  args: {
    open: true,
    profile: null,
    isLoggedIn: false,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    open: true,
    profile: null,
    isLoggedIn: false,
    isLoading: true,
  },
};

export const Closed: Story = {
  args: {
    open: false,
    profile: null,
    isLoggedIn: false,
    isLoading: false,
  },
};
