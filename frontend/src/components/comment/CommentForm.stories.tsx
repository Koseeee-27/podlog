import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { CommentFormState } from "@/lib/actions/comment";
import CommentForm from "./CommentForm";

const noopAction = async (
  _prev: CommentFormState,
  _fd: FormData,
): Promise<CommentFormState> => ({ success: false });

const errorAction = async (
  _prev: CommentFormState,
  _fd: FormData,
): Promise<CommentFormState> => ({
  success: false,
  error: "感想の投稿に失敗しました。時間をおいて再度お試しください。",
});

const meta = {
  title: "Comment/CommentForm",
  component: CommentForm,
  tags: ["autodocs"],
} satisfies Meta<typeof CommentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    action: noopAction,
  },
};

export const Editing: Story = {
  args: {
    action: noopAction,
    initialBody:
      "前半のゲストトークが特に面白かった！後半のリスナーメール紹介もテンポが良くて、一気に最後まで聴いてしまった。",
    submitLabel: "更新",
    placeholder: "感想を編集",
  },
};

export const NearSoftLimit: Story = {
  args: {
    action: noopAction,
    initialBody:
      "今週のエピソードもめちゃくちゃ面白かった。特にゲストの話がとても興味深く、いろいろと考えさせられる内容で、繰り返し聴きたくなる回でした。次回も楽しみ！",
    submitLabel: "投稿",
  },
};

export const WithError: Story = {
  args: {
    action: errorAction,
    initialBody: "送信失敗の確認用",
  },
};
