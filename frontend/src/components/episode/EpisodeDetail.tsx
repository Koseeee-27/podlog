import Link from "next/link";
import type { EpisodeWithStats } from "@/types/episode";
import { formatDuration, formatDate } from "@/lib/utils";

interface EpisodeDetailProps {
  episode: EpisodeWithStats;
}

export default function EpisodeDetail({ episode }: EpisodeDetailProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{episode.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
        {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
        {episode.duration_ms && <span>{formatDuration(episode.duration_ms)}</span>}
        {episode.review_count > 0 && (
          <span>
            {episode.average_rating.toFixed(1)} ({episode.review_count}件のレビュー)
          </span>
        )}
      </div>

      <div className="mt-2">
        <Link
          href={`/podcasts/${episode.podcast_id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ポッドキャストに戻る
        </Link>
      </div>

      {episode.audio_url && (
        <div className="mt-6">
          <audio controls className="w-full" preload="none">
            <source src={episode.audio_url} />
          </audio>
        </div>
      )}

      {episode.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">説明</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {episode.description}
          </p>
        </div>
      )}

      {episode.source_url && (
        <div className="mt-4">
          <a
            href={episode.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
          >
            元のページで見る
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
