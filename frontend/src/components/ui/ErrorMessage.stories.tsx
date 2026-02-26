import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ErrorMessage from "./ErrorMessage";

const meta = {
  title: "UI/ErrorMessage",
  component: ErrorMessage,
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { message: "エラーが発生しました。もう一度お試しください。" },
};

export const WithRetry: Story = {
  args: {
    message: "データの読み込みに失敗しました。",
    onRetry: () => alert("再試行"),
  },
};
