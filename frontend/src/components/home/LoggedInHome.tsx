"use client";

import { useAuth } from "@/hooks/useAuth";
import { useListeningRecords } from "@/hooks/useListeningRecord";
import GreetingSection from "./GreetingSection";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import CtaSection from "./CtaSection";
import Link from "next/link";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils";

const DISPLAY_LIMIT = 5;

/**
 * Cookie ありのユーザー向けトップページコンテンツ。
 * useAuth で正確な認証状態を判定し、表示を切り替える。
 *
 * - 認証済み → 挨拶 + 最近の聴取履歴
 * - 未認証（Cookie が残っているがセッション期限切れ等）→ マーケティング UI にフォールバック
 */
export default function LoggedInHome() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <Loading />;
  }

  // Cookie はあったが実際には未認証 → マーケティング UI を表示
  if (auth.status !== "authenticated") {
    return (
      <>
        <HeroSection />
        <FeaturesSection />
        <CtaSection />
      </>
    );
  }

  return (
    <>
      <GreetingSection displayName={auth.profile.display_name} />
      <RecentListening username={auth.profile.username} />
    </>
  );
}

function RecentListening({ username }: { username: string }) {
  const { records, loading, error } = useListeningRecords();

  if (loading) {
    return <Loading message="聴取記録を読み込み中..." />;
  }

  if (error) {
    return null;
  }

  const displayRecords = records.slice(0, DISPLAY_LIMIT);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">最近聴いた番組</h2>
        {displayRecords.length > 0 && (
          <Link
            href={`/users/${username}`}
            className="text-sm text-rose-500 hover:text-rose-600"
          >
            もっと見る
          </Link>
        )}
      </div>

      {displayRecords.length === 0 ? (
        <EmptyState
          icon={<MusicalNoteIcon className="h-12 w-12" />}
          message="まだ聴取記録がありません"
          description="番組を探して聴取記録を付けてみましょう"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      ) : (
        <div className="space-y-2">
          {displayRecords.map((record) => (
            <div
              key={record.id}
              className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
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
                    <MusicalNoteIcon className="h-5 w-5 text-stone-400" />
                  </div>
                )}
              </Link>

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
