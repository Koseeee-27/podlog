import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LoginPromptButton from "./LoginPromptButton";

const meta = {
  title: "UI/LoginPromptButton",
  component: LoginPromptButton,
  tags: ["autodocs"],
} satisfies Meta<typeof LoginPromptButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ListenRecord: Story = {
  args: {
    label: "ログインして記録する",
  },
};

export const WriteReview: Story = {
  args: {
    label: "ログインしてレビューを書く",
  },
};
