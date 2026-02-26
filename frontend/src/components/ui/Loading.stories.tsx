import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Loading from "./Loading";

const meta = {
  title: "UI/Loading",
  component: Loading,
  tags: ["autodocs"],
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: { message: "検索中..." },
};
