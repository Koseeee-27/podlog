import Link from "next/link";
import Image from "next/image";
import { StarIcon, HeartIcon } from "@heroicons/react/24/solid";
import type { PodcastSearchItem } from "@/types/podcast";

interface PodcastCardProps {
  podcast: PodcastSearchItem;
}

export default function PodcastCard({ podcast }: PodcastCardProps) {
  return (
    <Link
      href={`/podcasts/${podcast.id}`}
      className="flex gap-4 p-4 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow"
    >
      {podcast.artwork_url ? (
        <Image
          src={podcast.artwork_url}
          alt={podcast.title}
          width={80}
          height={80}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-8 w-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-stone-900 truncate">{podcast.title}</h3>
        {podcast.author && (
          <p className="text-sm text-stone-500 mt-0.5">{podcast.author}</p>
        )}
        {(podcast.total_ratings > 0 || podcast.favorite_count > 0) && (
          <div className="flex items-center gap-3 mt-1.5">
            {podcast.total_ratings > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                <StarIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>{podcast.average_rating.toFixed(1)}</span>
                <span>({podcast.total_ratings}件)</span>
              </span>
            )}
            {podcast.favorite_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                <HeartIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>{podcast.favorite_count}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
