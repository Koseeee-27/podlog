"use client";

import { useRef, useEffect, useTransition, useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createPodcastRequest } from "@/lib/api/podcast-requests";
import { useToast } from "@/components/ui/Toast";
import { isValidUrl } from "@/lib/utils";

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
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // フォームの状態
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [titleError, setTitleError] = useState("");
  const [urlError, setUrlError] = useState("");

  const resetForm = useCallback(() => {
    setTitle("");
    setUrl("");
    setTitleError("");
    setUrlError("");
  }, []);

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
      resetForm();
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose, resetForm]);

  const validate = (): boolean => {
    let valid = true;

    if (!title.trim()) {
      setTitleError("番組名を入力してください");
      valid = false;
    } else if (title.trim().length > 500) {
      setTitleError("番組名は500文字以内で入力してください");
      valid = false;
    } else {
      setTitleError("");
    }

    if (url.trim() && !isValidUrl(url.trim())) {
      setUrlError("正しいURLを入力してください");
      valid = false;
    } else {
      setUrlError("");
    }

    return valid;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    startTransition(async () => {
      try {
        await createPodcastRequest({
          title: title.trim(),
          url: url.trim() || undefined,
        });
        showToast("リクエストを送信しました");
        resetForm();
        onClose();
      } catch {
        showToast("送信に失敗しました。もう一度お試しください", "error");
      }
    });
  };

  // backdrop クリックでダイアログを閉じる
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // dialog 要素自体がクリックされた場合（= backdrop 領域）のみ閉じる
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

        <div className="space-y-4">
          <Input
            id="podcast-request-title"
            label="番組名"
            placeholder="例: オールナイトニッポン"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
            error={titleError}
            required
          />

          <Input
            id="podcast-request-url"
            label="配信先URL（任意）"
            placeholder="例: https://open.spotify.com/show/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) setUrlError("");
            }}
            error={urlError}
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
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={isPending}
            disabled={isPending || !title.trim()}
          >
            リクエストを送信
          </Button>
        </div>
      </div>
    </dialog>
  );
}
