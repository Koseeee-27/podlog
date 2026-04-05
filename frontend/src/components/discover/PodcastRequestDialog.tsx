"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { PodcastRequestFormState } from "@/lib/actions/podcast-request";
import {
  submitPodcastRequestAction,
  podcastRequestFormInitialState,
} from "@/lib/actions/podcast-request";

interface PodcastRequestDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 番組追加リクエストを送信するモーダルダイアログ。
 * HTML の <dialog> 要素を使い、アクセシビリティ（フォーカス管理・ESC 閉じ）を自動的に確保する。
 */
export default function PodcastRequestDialog({
  open,
  onClose,
}: PodcastRequestDialogProps) {
  if (!open) return null;
  return <PodcastRequestDialogContent onClose={onClose} />;
}

function PodcastRequestDialogContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const { showToast } = useToast();

  async function wrappedAction(
    prevState: PodcastRequestFormState,
    formData: FormData,
  ) {
    const result = await submitPodcastRequestAction(prevState, formData);
    if (result.success) {
      showToast("リクエストを送信しました");
      onClose();
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState(
    wrappedAction,
    podcastRequestFormInitialState,
  );

  return (
    <dialog
      ref={(dialog) => {
        dialog?.showModal();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.currentTarget.close();
        }
      }}
      className="backdrop:bg-black/50 bg-transparent p-0 m-0 max-w-none w-full h-full max-h-none open:flex items-center justify-center"
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          番組の追加をリクエスト
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          お探しの番組が見つからない場合、追加リクエストを送信できます。
        </p>

        {state.error && (
          <p className="text-sm text-red-600 mb-4">{state.error}</p>
        )}

        <form action={formAction}>
          <div className="space-y-4">
            <Input
              id="podcast-request-title"
              name="title"
              label="番組名"
              placeholder="例: オールナイトニッポン"
              required
              error={state.fieldErrors?.title}
            />

            <Input
              id="podcast-request-url"
              name="url"
              label="配信先URL（任意）"
              placeholder="例: https://open.spotify.com/show/..."
              error={state.fieldErrors?.url}
            />
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={isPending}
            >
              リクエストを送信
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
