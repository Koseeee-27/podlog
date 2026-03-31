import Link from "next/link";
import type { RecentEpisodeItem } from "@/types/episode";
import { formatDate } from "@/lib/utils";
import ListenButton from "./ListenButton";

interface RecentEpisodeCardProps {
  episode: RecentEpisodeItem;
  /** true の場合、カード右端にインラインの聴取記録ボタンを表示する */
  showListenButton?: boolean;
}

/**
 * 記録ページの新着エピソードカード（番組グループ内で使用）。
 * エピソードタイトル・公開日を表示する。番組情報は親コンポーネントで表示する。
 */
export default function RecentEpisodeCard({ episode, showListenButton }: RecentEpisodeCardProps) {
  if (showListenButton) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-lg border border-stone-200">
        <Link href={`/episodes/${episode.id}`} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
          <h4 className="text-sm font-medium text-stone-900 line-clamp-1">
            {episode.title}
          </h4>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          {episode.published_at && (
            <span className="text-xs text-stone-400">
              {formatDate(episode.published_at)}
            </span>
          )}
          <ListenButton episodeId={episode.id} compact />
        </div>
      </div>
    );
  }

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
