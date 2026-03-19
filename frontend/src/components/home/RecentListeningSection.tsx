import Link from "next/link";
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
              className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              <Link
                href={`/episodes/${record.episode.id}`}
                className="text-sm font-medium text-stone-900 hover:text-rose-600"
              >
                {record.episode.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Link
                  href={`/podcasts/${record.podcast.id}`}
                  className="text-xs text-stone-500 hover:text-rose-600"
                >
                  {record.podcast.title}
                </Link>
                <span className="text-xs text-stone-400">
                  {formatDate(record.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
