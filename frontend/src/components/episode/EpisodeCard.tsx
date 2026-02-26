import Link from "next/link";
import type { Episode } from "@/types/episode";
import { formatDuration, formatDate } from "@/lib/utils";

interface EpisodeCardProps {
  episode: Episode;
}

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <Link
      href={`/episodes/${episode.id}`}
      className="block p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
    >
      <h3 className="font-medium text-gray-900 line-clamp-2">{episode.title}</h3>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
        {episode.duration_ms && <span>{formatDuration(episode.duration_ms)}</span>}
      </div>
      {episode.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{episode.description}</p>
      )}
    </Link>
  );
}
