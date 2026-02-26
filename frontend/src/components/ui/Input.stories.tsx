import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Input from "./Input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "example",
    label: "メールアドレス",
    placeholder: "you@example.com",
  },
};

export const WithError: Story = {
  args: {
    id: "example-error",
    label: "ユーザー名",
    error: "このユーザー名は既に使用されています",
    defaultValue: "taken_user",
  },
};

export const Password: Story = {
  args: {
    id: "password",
    label: "パスワード",
    type: "password",
    placeholder: "6文字以上",
  },
};
