import Link from "next/link";
import type { TimelineItem } from "@/types/review";
import { formatDate } from "@/lib/utils";

interface TimelineCardProps {
  item: TimelineItem;
}

export default function TimelineCard({ item }: TimelineCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">
          {item.user.display_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/users/${item.user.username}`}
              className="text-sm font-medium text-stone-900 hover:text-rose-600"
            >
              {item.user.display_name}
            </Link>
            <span className="text-xs text-stone-400">{formatDate(item.created_at)}</span>
          </div>

          <div className="mt-1">
            <Link
              href={`/episodes/${item.episode.id}`}
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              {item.episode.title}
            </Link>
            <span className="text-xs text-stone-400 ml-2">
              <Link
                href={`/podcasts/${item.podcast.id}`}
                className="hover:text-rose-600"
              >
                {item.podcast.title}
              </Link>
            </span>
          </div>

          <div className="mt-1 text-sm text-yellow-500">
            {"★".repeat(item.rating)}
            {"☆".repeat(5 - item.rating)}
          </div>

          {item.comment && (
            <p className="mt-2 text-sm text-stone-700 whitespace-pre-wrap">{item.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
}
