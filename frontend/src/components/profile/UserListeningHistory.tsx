import Link from "next/link";
import type { ListeningRecordItem } from "@/types/listening-record";
import { formatDate } from "@/lib/utils";

interface UserListeningHistoryProps {
  records: ListeningRecordItem[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function UserListeningHistory({
  records,
  total,
  loading,
  hasMore,
  onLoadMore,
}: UserListeningHistoryProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-stone-900">聴取履歴</h2>
        {total > 0 && <span className="text-sm text-stone-500">{total}件</span>}
      </div>

      {records.length === 0 && !loading ? (
        <p className="text-sm text-stone-500">まだ聴取記録がありません</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="rounded-lg border border-stone-200 p-3">
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
                <span className="text-xs text-stone-400">{formatDate(record.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && records.length > 0 && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </section>
  );
}
