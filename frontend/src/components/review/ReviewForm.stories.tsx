import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReviewFormState } from "@/lib/actions/review";
import ReviewForm from "./ReviewForm";

const noopAction = async (_prev: ReviewFormState, _fd: FormData): Promise<ReviewFormState> => ({
  success: false,
});

const meta = {
  title: "Review/ReviewForm",
  component: ReviewForm,
  tags: ["autodocs"],
} satisfies Meta<typeof ReviewForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    action: noopAction,
  },
};

export const WithInitialValues: Story = {
  args: {
    action: noopAction,
    initialRating: 4,
    initialComment: "とても面白いエピソードでした！",
    submitLabel: "更新する",
  },
};
