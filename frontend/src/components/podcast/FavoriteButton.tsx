"use client";

import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

interface FavoriteButtonProps {
  isFavorite: boolean;
  isPending: boolean;
  onClick: () => void;
}

/**
 * 「好きな番組に追加 / 削除」ボタン。
 * ハートアイコンとテキストで状態を表示する。
 */
export default function FavoriteButton({ isFavorite, isPending, onClick }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        isFavorite
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "bg-white text-stone-900 border border-stone-200 hover:bg-stone-50"
      }`}
    >
      {isFavorite ? (
        <HeartSolid className="w-5 h-5 text-rose-500" />
      ) : (
        <HeartOutline className="w-5 h-5" />
      )}
      {isPending
        ? "処理中..."
        : isFavorite
          ? "好きな番組から削除"
          : "好きな番組に追加"}
    </button>
  );
}
