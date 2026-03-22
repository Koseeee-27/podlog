"use client";

import { type ChangeEvent, useRef, useState, useTransition, useEffect, useCallback } from "react";
import Image from "next/image";
import { uploadAvatar } from "@/lib/api/users";
import { CameraIcon } from "@heroicons/react/24/outline";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  displayName: string;
  onUploadComplete: (newAvatarUrl: string) => void;
  onError: (message: string) => void;
}

export default function AvatarUpload({
  currentAvatarUrl,
  displayName,
  onUploadComplete,
  onError,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const avatarSrc = previewUrl ?? currentAvatarUrl;

  // ObjectURL のメモリリーク防止: 古い ObjectURL を解放するヘルパー
  const revokePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  // previewUrl が変わるたびにクリーンアップ関数を更新し、unmount 時に解放する
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      onError("JPEG または PNG 形式の画像を選択してください");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onError("ファイルサイズは 2MB 以下にしてください");
      e.target.value = "";
      return;
    }

    // 古い ObjectURL を解放してからプレビュー表示
    revokePreview();
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // アップロード
    startTransition(async () => {
      try {
        const result = await uploadAvatar(file);
        // アップロード成功: プレビューをサーバーの URL に切り替え、ObjectURL を解放
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
        onUploadComplete(result.avatar_url);
      } catch (err) {
        // エラー時: ObjectURL を解放してプレビューをクリア
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
        onError(getUserFriendlyErrorMessage(err));
      }
    });

    // input をリセット（同じファイルを再選択可能にする）
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={displayName}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <svg
              className="animate-spin h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CameraIcon className="w-4 h-4" />
        画像を変更する
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="アバター画像を選択"
      />
    </div>
  );
}
