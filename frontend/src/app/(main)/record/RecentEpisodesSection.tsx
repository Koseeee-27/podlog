import Link from "next/link";
import Image from "next/image";
import {
  MicrophoneIcon,
  PlusCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { serverGet } from "@/lib/api/server";
import RecentEpisodeCard from "@/components/episode/RecentEpisodeCard";
import type { RecentEpisodesResult } from "@/types/episode";

/**
 * 記録した番組の新着エピソードセクション。
 * async Server Component として Suspense 内で使用する。
 *
 * - serverGet でデータ取得（useEffect 不要）
 * - 初回ユーザー（recorded_podcast_count === 0）なら何も表示しない
 * - 新着が空なら「新着エピソードはありません」を表示
 */
export default async function RecentEpisodesSection() {
  const result = await serverGet<RecentEpisodesResult>(
    "/users/me/recent-episodes",
  );

  const podcastGroups = result.podcasts ?? [];
  const recordedPodcastCount = result.recorded_podcast_count ?? 0;

  // 初回ユーザー: 記録した番組が0件なら新着セクション自体を非表示
  if (recordedPodcastCount === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        <PlusCircleIcon className="inline h-5 w-5 mr-1.5 text-rose-500 align-text-bottom" />
        記録した番組の新着エピソード
      </h2>

      {podcastGroups.length === 0 && (
        <p className="text-sm text-stone-500 py-4">
          新着エピソードはありません
        </p>
      )}

      {/* 番組ごとにグループ化して表示 */}
      <div className="space-y-6">
        {podcastGroups.map((group) => (
          <div key={group.podcast.id}>
            {/* 番組ヘッダー: アートワーク + 番組名 */}
            <Link
              href={`/podcasts/${group.podcast.id}`}
              className="flex items-center gap-3 mb-2 group"
            >
              {group.podcast.artwork_url ? (
                <Image
                  src={group.podcast.artwork_url}
                  alt={group.podcast.title}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <MicrophoneIcon className="h-5 w-5 text-stone-400" />
                </div>
              )}
              <h3 className="text-sm font-semibold text-stone-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                {group.podcast.title}
              </h3>
            </Link>

            {/* エピソード一覧（最大3件） */}
            <div className="space-y-1.5 ml-[52px]">
              {group.episodes.map((episode) => (
                <RecentEpisodeCard
                  key={episode.id}
                  episode={episode}
                  showListenButton
                />
              ))}
            </div>

            {/* 「もっと見る」リンク（未聴取が3件より多い場合） */}
            {group.total_unlistened > 3 && (
              <div className="ml-[52px] mt-1.5">
                <Link
                  href={`/podcasts/${group.podcast.id}`}
                  className="inline-flex items-center gap-0.5 text-xs text-stone-500 hover:text-rose-600 transition-colors"
                >
                  もっと見る（残り{group.total_unlistened - group.episodes.length}
                  件）
                  <ChevronRightIcon className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
