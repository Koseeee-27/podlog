import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import HeroSection from "./HeroSection";

const meta = {
  title: "Home/HeroSection",
  component: HeroSection,
  tags: ["autodocs"],
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
