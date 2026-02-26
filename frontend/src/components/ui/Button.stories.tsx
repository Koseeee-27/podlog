import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "danger"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: "ボタン", variant: "primary" },
};

export const Secondary: Story = {
  args: { children: "ボタン", variant: "secondary" },
};

export const Outline: Story = {
  args: { children: "ボタン", variant: "outline" },
};

export const Ghost: Story = {
  args: { children: "ボタン", variant: "ghost" },
};

export const Danger: Story = {
  args: { children: "削除", variant: "danger" },
};

export const Loading: Story = {
  args: { children: "送信中", loading: true },
};

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large", size: "lg" },
};
