import Link from "next/link";
import Image from "next/image";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import { serverGet } from "@/lib/api/server";
import { formatDate } from "@/lib/utils";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import CtaSection from "@/components/home/CtaSection";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { User } from "@/types/user";

const DISPLAY_LIMIT = 5;

/**
 * ログイン済みユーザー向けホーム画面。
 * Server Component でプロフィールと聴取履歴を取得する。
 * serverGet("/users/me") の成功/失敗で認証状態を判定する。
 * 未認証の場合はマーケティング UI にフォールバックする。
 */
export default async function RecentListeningSection() {
  let profile: User;
  try {
    profile = await serverGet<User>("/users/me");
  } catch {
    // 未認証（Cookie はあるがセッション期限切れ等）→ マーケティング UI を表示
    return (
      <>
        <HeroSection />
        <FeaturesSection />
        <CtaSection />
      </>
    );
  }

  let records: ListeningRecordListResult | null = null;
  try {
    records = await serverGet<ListeningRecordListResult>(
      `/users/me/listening-records?limit=${DISPLAY_LIMIT}`,
    );
  } catch {
    // 聴取履歴の取得失敗は致命的ではない → 空として扱う
  }

  const displayRecords = records?.records ?? [];

  return (
    <>
      <section className="py-4">
        <h1 className="text-2xl font-bold text-stone-900">
          {profile.display_name} さん、こんにちは
        </h1>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">最近聴いた番組</h2>
          {displayRecords.length > 0 && (
            <Link
              href={`/users/${profile.username}`}
              className="text-sm text-rose-500 hover:text-rose-600"
            >
              もっと見る
            </Link>
          )}
        </div>

        {displayRecords.length === 0 ? (
          <EmptyListening />
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
    </>
  );
}

function EmptyListening() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MusicalNoteIcon className="h-12 w-12 text-stone-300 mb-4" />
      <p className="text-stone-600 font-medium">まだ聴取記録がありません</p>
      <p className="text-sm text-stone-400 mt-1">
        番組を探して聴取記録を付けてみましょう
      </p>
      <Link
        href="/discover"
        className="mt-4 inline-flex items-center rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
      >
        番組を探す
      </Link>
    </div>
  );
}
