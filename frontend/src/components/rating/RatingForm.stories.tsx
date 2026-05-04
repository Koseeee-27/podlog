import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RatingFormState } from "@/lib/actions/rating";
import RatingForm from "./RatingForm";

const noopAction = async (
  _prev: RatingFormState,
  _fd: FormData,
): Promise<RatingFormState> => ({
  success: false,
});

const meta = {
  title: "Rating/RatingForm",
  component: RatingForm,
  tags: ["autodocs"],
} satisfies Meta<typeof RatingForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    action: noopAction,
  },
};

export const WithInitialRating: Story = {
  args: {
    action: noopAction,
    initialRating: 4,
    submitLabel: "更新する",
  },
};
