"use client";

import type { Genre } from "@/types/genre";

interface GenreChipsProps {
  /** ジャンル一覧 */
  genres: Genre[];
  /** 現在選択中のジャンル ID（null = 「すべて」） */
  selectedGenre: string | null;
  /** ジャンル選択時のコールバック（null = 「すべて」を選択） */
  onSelect: (genreId: string | null) => void;
  /** ジャンル取得中のローディング状態 */
  loading?: boolean;
}

export default function GenreChips({
  genres,
  selectedGenre,
  onSelect,
  loading = false,
}: GenreChipsProps) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-16 rounded-full bg-stone-200 animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (genres.length === 0) {
    return null;
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:overflow-x-visible"
      role="radiogroup"
      aria-label="ジャンルで絞り込み"
    >
      {/* 「すべて」チップ */}
      <button
        type="button"
        role="radio"
        aria-checked={selectedGenre === null}
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selectedGenre === null
            ? "bg-rose-500 text-white"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`}
      >
        すべて
      </button>

      {/* ジャンルチップ */}
      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          role="radio"
          aria-checked={selectedGenre === genre.id}
          onClick={() => onSelect(genre.id)}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
            selectedGenre === genre.id
              ? "bg-rose-500 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          {genre.name_ja}
        </button>
      ))}
    </div>
  );
}
