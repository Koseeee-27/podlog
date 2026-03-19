"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getMyListeningRecords } from "@/lib/api/listening-records";
import { formatDate } from "@/lib/utils";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import type { ListeningRecordItem } from "@/types/listening-record";

const DISPLAY_LIMIT = 5;

export default function RecentListeningSection() {
  const auth = useAuth();
  const [records, setRecords] = useState<ListeningRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const username =
    auth.status === "authenticated" ? auth.profile.username : null;

  useEffect(() => {
    if (auth.status === "loading") return;
    if (auth.status !== "authenticated") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRecords() {
      try {
        const result = await getMyListeningRecords({ limit: DISPLAY_LIMIT });
        if (!cancelled) {
          setRecords(result.records);
        }
      } catch {
        if (!cancelled) {
          setError("聴取記録の取得に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRecords();
    return () => {
      cancelled = true;
    };
  }, [auth.status]);

  if (auth.status !== "authenticated") {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">最近聴いた番組</h2>
        {username && records.length > 0 && (
          <Link
            href={`/users/${username}`}
            className="text-sm text-rose-500 hover:text-rose-600"
          >
            もっと見る
          </Link>
        )}
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && records.length === 0 && (
        <EmptyState
          icon={<MusicalNoteIcon className="h-12 w-12" />}
          message="まだ聴取記録がありません"
          description="番組を探して聴取記録を付けてみましょう"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      )}

      {!loading && records.length > 0 && (
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
