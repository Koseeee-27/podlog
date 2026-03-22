"use client";

import type { Genre } from "@/types/genre";

/** ジャンルごとの背景色（Tailwind クラス） */
const GENRE_COLORS: Record<string, string> = {
  Arts: "bg-fuchsia-500",
  Business: "bg-blue-600",
  Comedy: "bg-amber-500",
  Education: "bg-emerald-500",
  Fiction: "bg-purple-500",
  Government: "bg-slate-500",
  "Health & Fitness": "bg-green-500",
  History: "bg-orange-700",
  "Kids & Family": "bg-pink-400",
  Leisure: "bg-teal-500",
  Music: "bg-rose-500",
  News: "bg-red-600",
  "Religion & Spirituality": "bg-indigo-500",
  Science: "bg-cyan-600",
  "Society & Culture": "bg-violet-500",
  Sports: "bg-lime-600",
  Technology: "bg-sky-500",
  "True Crime": "bg-stone-700",
  "TV & Film": "bg-yellow-500",
};

function getGenreColor(nameEn: string): string {
  return GENRE_COLORS[nameEn] ?? "bg-stone-500";
}

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-stone-200 animate-pulse"
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
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      role="list"
      aria-label="ジャンルから探す"
    >
      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          role="listitem"
          onClick={() => onSelect(genre.id)}
          className={`${getGenreColor(genre.name_en)} rounded-xl px-4 py-5 text-left text-white font-semibold text-sm shadow-sm hover:opacity-90 hover:shadow-md transition-all`}
        >
          {genre.name_ja}
        </button>
      ))}
    </div>
  );
}
