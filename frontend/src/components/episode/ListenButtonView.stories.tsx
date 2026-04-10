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
    onToggle: () => {},
  },
};

export const Listened: Story = {
  args: {
    listened: true,
    onToggle: () => {},
  },
};

export const CompactNotListened: Story = {
  args: {
    listened: false,
    compact: true,
    onToggle: () => {},
  },
};

export const CompactListened: Story = {
  args: {
    listened: true,
    compact: true,
    onToggle: () => {},
  },
};
