import Link from "next/link";
import type { RecentEpisodeItem } from "@/types/episode";
import { formatDate } from "@/lib/utils";
import ListenButton from "./ListenButton";

interface RecentEpisodeCardProps {
  episode: RecentEpisodeItem;
}

/**
 * 記録ページの新着エピソードカード（番組グループ内で使用）。
 * エピソードタイトル・公開日・聴取ボタンを表示する。番組情報は親コンポーネントで表示する。
 */
export default function RecentEpisodeCard({ episode }: RecentEpisodeCardProps) {
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
        <ListenButton episodeId={episode.id} initialListened={false} compact />
      </div>
    </div>
  );
}
