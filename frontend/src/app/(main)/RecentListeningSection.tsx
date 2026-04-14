import Link from "next/link";
import Image from "next/image";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import { getMyProfile, getMyListeningRecords } from "@/lib/data/me";
import { formatDate } from "@/lib/utils";
import { ApiRequestError } from "@/types/api";
import EmptyState from "@/components/ui/EmptyState";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import CtaSection from "@/components/home/CtaSection";
import type { User } from "@/types/user";

const DISPLAY_LIMIT = 5;

/**
 * ログイン済みユーザー向けホーム画面。
 * Server Component で `getMyProfile()` → `getMyListeningRecords()` の順に
 * 直列取得する。
 *
 * 公開ページ (/) のフォールバック系コンポーネントなので、保護ページの
 * 「401/403 → /login redirect」とは異なり、未認証時はマーケティング UI を
 * インラインで表示する設計。
 *
 * 並列ではなく直列にしている理由:
 * - 公開ページなので未ログイン/セッション失効ユーザーのアクセスも多い
 * - 並列だと未ログイン時にも /users/me/listening-records を必ず叩くため、
 *   日次で大量の無駄な 401 リクエストがバックエンド負荷・ログノイズになる
 * - 認証状態を確定してから records を取得することで、未ログイン時は
 *   1 リクエストで済む (200 経路ではレイテンシが ~50ms 増えるが体感上影響なし)
 *
 * 状態別の挙動:
 * - 401/403: 未認証 or セッション失効・権限剥奪 → マーケティング UI
 * - 404: プロフィール未設定 → null（何も表示しない）
 * - その他のエラー: throw して Error Boundary で捕捉
 */
export default async function RecentListeningSection() {
  // ステップ 1: 認証状態を確定する。401/403/404 で未ログイン/未作成と
  // 分かれば listening-records は呼ばずにフォールバック UI に倒す。
  let profile: User;
  try {
    profile = await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = 未認証 or セッション失効 → マーケティング UI
      // (保護ページとは違いリダイレクトせず、公開ページとして fallback 表示)
      if (err.status === 401 || err.status === 403) {
        return (
          <>
            <HeroSection />
            <FeaturesSection />
            <CtaSection />
          </>
        );
      }
      if (err.status === 404) {
        // プロフィール未設定（ログイン済みだが /users/me が 404）
        return null;
      }
    }
    // 500 等のサーバーエラー → throw して Error Boundary で捕捉
    throw err;
  }

  // ステップ 2: 認証確定後に聴取履歴を取得する。
  // 失敗は throw して Error Boundary に委譲する (records が無くても
  // ヘッダー等は表示できる方が UX が良いが、並列時の挙動と揃えるため
  // throw 経路を維持する)。
  const recordsResult = await getMyListeningRecords(DISPLAY_LIMIT);
  const displayRecords = recordsResult.records ?? [];

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
    </>
  );
}
