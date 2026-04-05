"use client";

import { useRef, useEffect, useActionState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();
  const [state, formAction, isPending] = useActionState(
    submitPodcastRequestAction,
    podcastRequestFormInitialState,
  );

  const prevSuccessRef = useRef(false);

  const resetAndClose = useCallback(() => {
    formRef.current?.reset();
    onClose();
  }, [onClose]);

  // 送信成功時にダイアログを閉じてトースト表示
  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      showToast("リクエストを送信しました");
      resetAndClose();
    }
    prevSuccessRef.current = state.success;
  }, [state, showToast, resetAndClose]);

  // open の変更に応じてダイアログの開閉を制御
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // ダイアログの close イベント（ESC キーや backdrop クリック）をハンドリング
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      formRef.current?.reset();
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // backdrop クリックでダイアログを閉じる
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (e.target === dialog) {
      dialog.close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
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

        <form ref={formRef} action={formAction}>
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
              onClick={() => dialogRef.current?.close()}
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
