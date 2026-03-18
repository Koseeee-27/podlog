import Link from "next/link";
import { StarIcon } from "@heroicons/react/24/solid";
import type { EpisodeListItem } from "@/types/episode";
import { formatDuration, formatDate } from "@/lib/utils";

interface EpisodeCardProps {
  episode: EpisodeListItem;
}

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <Link
      href={`/episodes/${episode.id}`}
      className="block p-4 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <h3 className="font-medium text-stone-900 line-clamp-2">{episode.title}</h3>
      <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
        {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
        {episode.duration_ms && <span>{formatDuration(episode.duration_ms)}</span>}
        {episode.total_reviews > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <StarIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>{episode.average_rating.toFixed(1)}</span>
            <span className="ml-0.5">({episode.total_reviews}件)</span>
          </span>
        )}
      </div>
      {episode.description && (
        <p className="mt-2 text-sm text-stone-600 line-clamp-2">{episode.description}</p>
      )}
    </Link>
  );
}
