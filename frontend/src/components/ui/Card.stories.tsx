import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Card from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    padding: { control: "select", options: ["none", "sm", "md", "lg"] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "カードの中身です。テキストやコンポーネントを配置できます。",
  },
};

export const NoPadding: Story = {
  args: {
    padding: "none",
    children: "パディングなしのカードです。",
  },
};
