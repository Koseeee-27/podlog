import Link from "next/link";
import type { Genre } from "@/types/genre";

interface GenreGridProps {
  genres: Genre[];
}

export default function GenreGrid({ genres }: GenreGridProps) {
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
          <Link
            href={`/discover?genre=${encodeURIComponent(genre.id)}`}
            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm font-medium text-stone-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
          >
            {genre.name_ja}
          </Link>
        </li>
      ))}
    </ul>
  );
}
