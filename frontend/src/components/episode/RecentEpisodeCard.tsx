import Link from "next/link";
import Image from "next/image";
import type { RecentEpisodeItem } from "@/types/episode";
import { formatDate } from "@/lib/utils";

interface RecentEpisodeCardProps {
  episode: RecentEpisodeItem;
}

/**
 * 記録ページの新着エピソードカード。
 * 番組のアートワーク・番組名・エピソードタイトル・公開日を表示する。
 */
export default function RecentEpisodeCard({ episode }: RecentEpisodeCardProps) {
  return (
    <Link
      href={`/episodes/${episode.id}`}
      className="flex gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* 番組アートワーク */}
      {episode.podcast.artwork_url ? (
        <Image
          src={episode.podcast.artwork_url}
          alt={episode.podcast.title}
          width={56}
          height={56}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-6 w-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-stone-900 line-clamp-2">
          {episode.title}
        </h3>
        <p className="text-xs text-stone-500 mt-0.5 truncate">
          {episode.podcast.title}
        </p>
        {episode.published_at && (
          <p className="text-xs text-stone-400 mt-0.5">
            {formatDate(episode.published_at)}
          </p>
        )}
      </div>
    </Link>
  );
}
