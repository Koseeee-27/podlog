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
 * ハートアイコンのみで状態を表示し、ツールチップで補足する。
 */
export default function FavoriteButton({ isFavorite, isPending, onClick }: FavoriteButtonProps) {
  const label = isFavorite ? "好きな番組から削除" : "好きな番組に追加";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors disabled:opacity-50 ${
        isFavorite
          ? "text-rose-500 hover:bg-rose-50"
          : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
      }`}
    >
      {isFavorite ? (
        <HeartSolid className="w-6 h-6" />
      ) : (
        <HeartOutline className="w-6 h-6" />
      )}
    </button>
  );
}
