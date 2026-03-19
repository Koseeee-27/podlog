import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PodcastRequestDialog from "./PodcastRequestDialog";
import { ToastProvider } from "@/components/ui/Toast";

const meta = {
  title: "Discover/PodcastRequestDialog",
  component: PodcastRequestDialog,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof PodcastRequestDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
  },
};
