import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider, useToast } from "./Toast";

function ToastDemo({ message, type }: { message: string; type: "success" | "error" | "info" }) {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-4 py-2 font-semibold"
      onClick={() => showToast(message, type)}
    >
      トーストを表示
    </button>
  );
}

const meta = {
  title: "UI/Toast",
  component: ToastDemo,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  argTypes: {
    type: {
      control: "select",
      options: ["success", "error", "info"],
    },
  },
} satisfies Meta<typeof ToastDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { message: "聴取記録を追加しました", type: "success" },
};

export const Error: Story = {
  args: { message: "エラーが発生しました", type: "error" },
};

export const Info: Story = {
  args: { message: "情報メッセージです", type: "info" },
};
