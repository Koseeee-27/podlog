import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ListenButtonView from "./ListenButtonView";

const meta = {
  title: "Episode/ListenButton",
  component: ListenButtonView,
  tags: ["autodocs"],
} satisfies Meta<typeof ListenButtonView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotListened: Story = {
  args: {
    listened: false,
    loading: false,
    toggling: false,
    onToggle: () => {},
  },
};

export const Listened: Story = {
  args: {
    listened: true,
    loading: false,
    toggling: false,
    onToggle: () => {},
  },
};

export const Loading: Story = {
  args: {
    listened: false,
    loading: true,
    toggling: false,
    onToggle: () => {},
  },
};

export const Toggling: Story = {
  args: {
    listened: false,
    loading: false,
    toggling: true,
    onToggle: () => {},
  },
};

export const WithError: Story = {
  args: {
    listened: false,
    loading: false,
    toggling: false,
    error: "操作に失敗しました",
    onToggle: () => {},
  },
};

export const CompactNotListened: Story = {
  args: {
    listened: false,
    loading: false,
    toggling: false,
    compact: true,
    onToggle: () => {},
  },
};

export const CompactListened: Story = {
  args: {
    listened: true,
    loading: false,
    toggling: false,
    compact: true,
    onToggle: () => {},
  },
};

export const CompactLoading: Story = {
  args: {
    listened: false,
    loading: true,
    toggling: false,
    compact: true,
    onToggle: () => {},
  },
};

export const CompactToggling: Story = {
  args: {
    listened: false,
    loading: false,
    toggling: true,
    compact: true,
    onToggle: () => {},
  },
};
