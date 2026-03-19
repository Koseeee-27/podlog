import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import FavoriteButton from "./FavoriteButton";

const meta: Meta<typeof FavoriteButton> = {
  title: "podcast/FavoriteButton",
  component: FavoriteButton,
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
  },
};

export default meta;
type Story = StoryObj<typeof FavoriteButton>;

export const NotFavorite: Story = {
  args: {
    isFavorite: false,
    isPending: false,
  },
};

export const Favorite: Story = {
  args: {
    isFavorite: true,
    isPending: false,
  },
};

export const Pending: Story = {
  args: {
    isFavorite: false,
    isPending: true,
  },
};
