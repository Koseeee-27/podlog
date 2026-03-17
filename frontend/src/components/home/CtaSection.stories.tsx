import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CtaSection from "./CtaSection";

const meta = {
  title: "Home/CtaSection",
  component: CtaSection,
  tags: ["autodocs"],
} satisfies Meta<typeof CtaSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
