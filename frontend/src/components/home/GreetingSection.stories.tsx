import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GreetingSection from "./GreetingSection";

const meta = {
  title: "Home/GreetingSection",
  component: GreetingSection,
  tags: ["autodocs"],
} satisfies Meta<typeof GreetingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
