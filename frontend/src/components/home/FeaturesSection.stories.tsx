import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import FeaturesSection from "./FeaturesSection";

const meta = {
  title: "Home/FeaturesSection",
  component: FeaturesSection,
  tags: ["autodocs"],
} satisfies Meta<typeof FeaturesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
