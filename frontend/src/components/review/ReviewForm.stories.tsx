import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewForm from "./ReviewForm";

const meta = {
  title: "Review/ReviewForm",
  component: ReviewForm,
  tags: ["autodocs"],
} satisfies Meta<typeof ReviewForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: async () => {},
  },
};

export const WithInitialValues: Story = {
  args: {
    onSubmit: async () => {},
    initialRating: 4,
    initialComment: "とても面白いエピソードでした！",
    submitLabel: "更新する",
  },
};

export const Loading: Story = {
  args: {
    onSubmit: async () => {},
    loading: true,
  },
};
