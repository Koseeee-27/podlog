import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewPrompt from "./ReviewPrompt";

const meta = {
  title: "Episode/ReviewPrompt",
  component: ReviewPrompt,
  tags: ["autodocs"],
} satisfies Meta<typeof ReviewPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClickReview: () => {},
  },
};
