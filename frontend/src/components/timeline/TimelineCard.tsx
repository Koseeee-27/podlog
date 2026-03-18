import Link from "next/link";
import Image from "next/image";
import type { TimelineItem } from "@/types/review";
import { formatDate, formatStars } from "@/lib/utils";

interface TimelineCardProps {
  item: TimelineItem;
}

export default function TimelineCard({ item }: TimelineCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {/* アートワーク */}
        <Link href={`/podcasts/${item.podcast.id}`} className="shrink-0" aria-label={`${item.podcast.title}のページへ`}>
          {item.podcast.artwork_url ? (
            <Image
              src={item.podcast.artwork_url}
              alt={item.podcast.title}
              width={64}
              height={64}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-stone-100 flex items-center justify-center">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          )}
        </Link>

        {/* コンテンツ */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-medium text-rose-700">
              {item.user.display_name.charAt(0)}
            </div>
            <Link
              href={`/users/${item.user.username}`}
              className="text-xs font-medium text-stone-700 hover:text-rose-600 truncate min-w-0"
            >
              {item.user.display_name}
            </Link>
            <span className="text-xs text-stone-400 shrink-0">{formatDate(item.created_at)}</span>
          </div>

          <div className="mt-1.5">
            <Link
              href={`/episodes/${item.episode.id}`}
              className="text-sm font-semibold text-stone-900 hover:text-rose-600 line-clamp-1"
            >
              {item.episode.title}
            </Link>
            <Link
              href={`/podcasts/${item.podcast.id}`}
              className="block text-xs text-stone-500 hover:text-rose-600 truncate"
            >
              {item.podcast.title}
            </Link>
          </div>

          <div className="mt-1 text-sm text-yellow-500">
            {formatStars(item.rating)}
          </div>

          {item.comment && (
            <p className="mt-1.5 text-sm text-stone-700 whitespace-pre-wrap line-clamp-3">{item.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
}
