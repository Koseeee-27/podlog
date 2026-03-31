import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SearchBar from "./SearchBar";

const meta = {
  title: "Podcast/SearchBar",
  component: SearchBar,
  tags: ["autodocs"],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "", onChange: () => {}, onSubmit: () => {} },
};

export const WithQuery: Story = {
  args: { value: "Rebuild", onChange: () => {}, onSubmit: () => {} },
};

export const Loading: Story = {
  args: { value: "Rebuild", onChange: () => {}, onSubmit: () => {}, loading: true },
};
