import Link from "next/link";
import Image from "next/image";
import type { TimelineItem } from "@/types/comment";
import { formatDate } from "@/lib/utils";

interface TimelineCardProps {
  item: TimelineItem;
}

/**
 * タイムラインの 1 件カード。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で、旧 review ベース
 * （`OldTimelineItem`、rating + comment 文字列を含む）から新 comment ベース
 * （`TimelineItem`、`body` のみ）に切替。
 *
 * **本 PR では UI の本格再設計を行わず、データソースのみを差し替える最低限の修正**。
 * 旧カードと比較した変更点:
 *
 * - `formatStars(item.rating)` の星表示行を削除（評価は別画面で見る）
 * - `item.comment` (optional) を `item.body` (required) に置換
 * - line-clamp-3 で省略する挙動はそのまま
 *
 * 色・余白・要素配置（アートワーク + ユーザー情報行 + エピソード/番組タイトル）は
 * 現状維持。UI の本格的な再設計（X 風カードに寄せる等）は podlog-workspace#60 で扱う。
 */
export default function TimelineCard({ item }: TimelineCardProps) {
  // BE は display_name を omitempty で返すため、未設定時は username を fallback
  const displayName = item.user.display_name ?? item.user.username;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {/* アートワーク */}
        <Link
          href={`/podcasts/${item.podcast.id}`}
          className="shrink-0"
          aria-label={`${item.podcast.title}のページへ`}
        >
          {item.podcast.artwork_url ? (
            <Image
              src={item.podcast.artwork_url}
              alt={item.podcast.title}
              width={64}
              height={64}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-stone-100 flex items-center justify-center">
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6 text-stone-400"
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

        {/* コンテンツ */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-medium text-rose-700">
              {displayName.charAt(0)}
            </div>
            <Link
              href={`/users/${item.user.username}`}
              className="text-xs font-medium text-stone-700 hover:text-rose-600 truncate min-w-0"
            >
              {displayName}
            </Link>
            <span className="text-xs text-stone-400 shrink-0">
              {formatDate(item.created_at)}
            </span>
          </div>

          <div className="mt-1.5">
            <Link
              href={`/episodes/${item.episode.id}`}
              className="text-sm font-semibold text-stone-900 hover:text-rose-600 line-clamp-1"
            >
              {item.episode.title}
            </Link>
            <Link
              href={`/podcasts/${item.podcast.id}`}
              className="block text-xs text-stone-500 hover:text-rose-600 truncate"
            >
              {item.podcast.title}
            </Link>
          </div>

          {/* 感想本文（旧 review の星表示行は削除し、本文を主体に） */}
          <p className="mt-2 text-sm text-stone-700 whitespace-pre-wrap line-clamp-3">
            {item.body}
          </p>
        </div>
      </div>
    </div>
  );
}
