import Link from "next/link";
import Image from "next/image";
import type { FavoritePodcastItem } from "@/types/user";

interface UserFavoritePodcastsProps {
  podcasts: FavoritePodcastItem[];
  loading: boolean;
}

export default function UserFavoritePodcasts({ podcasts, loading }: UserFavoritePodcastsProps) {
  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">好きな番組</h2>
        <p className="text-sm text-stone-500">読み込み中...</p>
      </section>
    );
  }

  if (podcasts.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">好きな番組</h2>
      <div className="flex flex-wrap gap-4">
        {podcasts.map((podcast) => (
          <Link
            key={podcast.id}
            href={`/podcasts/${podcast.id}`}
            className="flex flex-col items-center gap-1.5 w-20 group"
          >
            {podcast.artwork_url ? (
              <Image
                src={podcast.artwork_url}
                alt={podcast.title}
                width={64}
                height={64}
                className="rounded-lg object-cover w-16 h-16"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-stone-200 flex items-center justify-center">
                <span className="text-stone-400 text-xs">No img</span>
              </div>
            )}
            <span className="text-xs text-stone-700 text-center line-clamp-2 group-hover:text-rose-600">
              {podcast.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
