import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AdminBadge from "./AdminBadge";

const meta = {
  title: "UI/AdminBadge",
  component: AdminBadge,
  tags: ["autodocs"],
} satisfies Meta<typeof AdminBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 表示名の横に配置した例 */
export const WithDisplayName: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-stone-900">田中太郎</span>
      <AdminBadge />
    </div>
  ),
};
