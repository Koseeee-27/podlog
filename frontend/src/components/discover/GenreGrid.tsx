"use client";

import type { Genre } from "@/types/genre";

interface GenreGridProps {
  genres: Genre[];
  onSelect: (genreId: string) => void;
  loading?: boolean;
}

export default function GenreGrid({
  genres,
  onSelect,
  loading = false,
}: GenreGridProps) {
  if (loading) {
    return (
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="h-16 rounded-xl bg-stone-200 animate-pulse"
          />
        ))}
      </ul>
    );
  }

  if (genres.length === 0) {
    return null;
  }

  return (
    <ul
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      aria-label="ジャンルから探す"
    >
      {genres.map((genre) => (
        <li key={genre.id}>
          <button
            type="button"
            onClick={() => onSelect(genre.id)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-left text-sm font-medium text-stone-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
          >
            {genre.name_ja}
          </button>
        </li>
      ))}
    </ul>
  );
}
