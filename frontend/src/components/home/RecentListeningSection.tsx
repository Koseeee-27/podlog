import Link from "next/link";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import { serverGet } from "@/lib/api/server";
import { formatDate } from "@/lib/utils";
import type {
  ListeningRecordItem,
  ListeningRecordListResult,
} from "@/types/listening-record";

const DISPLAY_LIMIT = 5;

interface RecentListeningSectionProps {
  username: string;
}

export default async function RecentListeningSection({
  username,
}: RecentListeningSectionProps) {
  let records: ListeningRecordItem[] = [];
  try {
    const result = await serverGet<ListeningRecordListResult>(
      `/users/me/listening-records?limit=${DISPLAY_LIMIT}`
    );
    records = result.records;
  } catch (error) {
    console.error(
      "RecentListeningSection: 聴取記録の取得に失敗しました",
      error
    );
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">最近聴いた番組</h2>
        {records.length > 0 && (
          <Link
            href={`/users/${username}`}
            className="text-sm text-rose-500 hover:text-rose-600"
          >
            もっと見る
          </Link>
        )}
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<MusicalNoteIcon className="h-12 w-12" />}
          message="まだ聴取記録がありません"
          description="番組を探して聴取記録を付けてみましょう"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              {/* アートワーク: 番組ページへ遷移 */}
              <Link
                href={`/podcasts/${record.podcast.id}`}
                className="shrink-0"
                aria-label={`${record.podcast.title}のページへ`}
              >
                {record.podcast.artwork_url ? (
                  <Image
                    src={record.podcast.artwork_url}
                    alt={record.podcast.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-stone-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                )}
              </Link>

              {/* テキスト領域: エピソード詳細ページへ遷移 */}
              <Link
                href={`/episodes/${record.episode.id}`}
                className="min-w-0 flex-1 rounded-lg px-2 py-1.5 -mx-1 hover:bg-stone-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                    {record.episode.title}
                  </span>
                  <span className="text-xs text-stone-400 shrink-0">
                    {formatDate(record.created_at)}
                  </span>
                </div>
                <p className="text-xs text-stone-500 truncate mt-0.5">
                  {record.podcast.title}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
