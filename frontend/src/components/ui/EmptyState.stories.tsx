import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EmptyState from "./EmptyState";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  BookOpenIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const TimelineEmpty: Story = {
  args: {
    icon: <ChatBubbleLeftRightIcon className="h-12 w-12" />,
    message: "まだレビューがありません",
    description: "最初のレビューを書いてみましょう！",
    ctaLabel: "番組を探す",
    ctaHref: "/discover",
  },
};

export const SearchNoResults: Story = {
  args: {
    icon: <MagnifyingGlassIcon className="h-12 w-12" />,
    message: "検索結果が見つかりませんでした",
    description: "別のキーワードで試してみてください",
  },
};

export const EpisodesEmpty: Story = {
  args: {
    icon: <MicrophoneIcon className="h-12 w-12" />,
    message: "エピソードはまだありません",
  },
};

export const ReviewsEmpty: Story = {
  args: {
    icon: <ChatBubbleLeftRightIcon className="h-12 w-12" />,
    message: "まだレビューはありません",
  },
};

export const ListeningHistoryEmpty: Story = {
  args: {
    icon: <MusicalNoteIcon className="h-12 w-12" />,
    message: "まだ聴取記録がありません",
    description: "エピソードを聴いたら記録してみましょう",
    ctaLabel: "番組を探す",
    ctaHref: "/discover",
  },
};

export const UserReviewsEmpty: Story = {
  args: {
    icon: <BookOpenIcon className="h-12 w-12" />,
    message: "まだレビューがありません",
    description: "聴いたエピソードの感想を書いてみましょう",
    ctaLabel: "番組を探す",
    ctaHref: "/discover",
  },
};

export const FavoritePodcastsEmpty: Story = {
  args: {
    icon: <HeartIcon className="h-12 w-12" />,
    message: "好きな番組がまだありません",
  },
};

export const GenrePodcastsEmpty: Story = {
  args: {
    icon: <MicrophoneIcon className="h-12 w-12" />,
    message: "このジャンルの番組はまだありません",
    description: "他のジャンルを探してみましょう",
  },
};
