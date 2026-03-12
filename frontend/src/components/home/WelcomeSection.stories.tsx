import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import WelcomeSection from "./WelcomeSection";

const meta = {
  title: "Home/WelcomeSection",
  component: WelcomeSection,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof WelcomeSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
