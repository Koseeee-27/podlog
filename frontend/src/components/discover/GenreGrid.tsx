"use client";

import type { Genre } from "@/types/genre";

/** ジャンルごとの背景色（Tailwind クラス）。白文字とのコントラストを確保するため暗めの色を使用 */
const GENRE_COLORS: Record<string, string> = {
  Arts: "bg-fuchsia-600",
  Business: "bg-blue-600",
  Comedy: "bg-amber-600",
  Education: "bg-emerald-600",
  Fiction: "bg-purple-600",
  Government: "bg-slate-600",
  "Health & Fitness": "bg-green-600",
  History: "bg-orange-700",
  "Kids & Family": "bg-pink-600",
  Leisure: "bg-teal-600",
  Music: "bg-rose-600",
  News: "bg-red-600",
  "Religion & Spirituality": "bg-indigo-600",
  Science: "bg-cyan-700",
  "Society & Culture": "bg-violet-600",
  Sports: "bg-lime-700",
  Technology: "bg-sky-600",
  "True Crime": "bg-stone-700",
  "TV & Film": "bg-yellow-700",
};

function getGenreColor(nameEn: string): string {
  return GENRE_COLORS[nameEn] ?? "bg-stone-600";
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
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="h-20 rounded-xl bg-stone-200 animate-pulse"
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
            className={`${getGenreColor(genre.name_en)} w-full rounded-xl px-4 py-5 text-left text-white font-semibold text-sm shadow-sm hover:opacity-90 hover:shadow-md transition-all`}
          >
            {genre.name_ja}
          </button>
        </li>
      ))}
    </ul>
  );
}
