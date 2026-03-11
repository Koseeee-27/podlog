import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import WelcomeSection from "./WelcomeSection";

const meta: Meta<typeof WelcomeSection> = {
  title: "Home/WelcomeSection",
  component: WelcomeSection,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof WelcomeSection>;

export const Default: Story = {};
