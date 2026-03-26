import Link from "next/link";
import type { RecentEpisodeItem } from "@/types/episode";
import { formatDate } from "@/lib/utils";

interface RecentEpisodeCardProps {
  episode: RecentEpisodeItem;
}

/**
 * 記録ページの新着エピソードカード（番組グループ内で使用）。
 * エピソードタイトル・公開日を表示する。番組情報は親コンポーネントで表示する。
 */
export default function RecentEpisodeCard({ episode }: RecentEpisodeCardProps) {
  return (
    <Link
      href={`/episodes/${episode.id}`}
      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-stone-900 line-clamp-1">
          {episode.title}
        </h4>
      </div>
      {episode.published_at && (
        <span className="text-xs text-stone-400 flex-shrink-0">
          {formatDate(episode.published_at)}
        </span>
      )}
    </Link>
  );
}
