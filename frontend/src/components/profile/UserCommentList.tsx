import Link from "next/link";
import type { UserCommentItem } from "@/types/comment";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";

interface UserCommentListProps {
  comments: UserCommentItem[];
  total: number;
  /** useTransition の isPending。true の間「もっと見る」を disabled にする */
  isPending: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

/**
 * ユーザーページの感想一覧（presentational）。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で追加。`UserReviewList`
 * （components/profile/UserReviewList.tsx、旧 review 用）の感想版で、
 * 同じ構造（セクション見出し + 件数バッジ + 一覧 + もっと見る）を踏襲する。
 *
 * 1 件のカードはエピソードタイトル + 番組タイトル + 投稿日 + 本文。投稿者
 * （= ページ主）の情報は外側のページレベル（PublicProfileClient のヘッダ）で
 * 表示済みなので、各カードでは省略する。
 *
 * 状態管理（hasMore / isPending / total 更新）は `CommentListLoader` 側に持たせ、
 * 本コンポーネントは props を受け取って描画するのみ（Storybook 化しやすくする
 * ため）。
 */
export default function UserCommentList({
  comments,
  total,
  isPending,
  hasMore,
  onLoadMore,
}: UserCommentListProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-stone-900">感想</h2>
        {total > 0 && (
          <span className="text-sm text-stone-500">{total}件</span>
        )}
      </div>

      {comments.length === 0 ? (
        <EmptyState
          icon={<ChatBubbleLeftIcon className="h-12 w-12" />}
          message="まだ感想がありません"
          description="聴いたエピソードの感想を書いてみましょう"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <Link
                href={`/episodes/${c.episode.id}`}
                className="text-sm font-medium text-stone-900 hover:text-rose-600 line-clamp-1"
              >
                {c.episode.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Link
                  href={`/podcasts/${c.podcast.id}`}
                  className="text-xs text-stone-500 hover:text-rose-600 truncate"
                >
                  {c.podcast.title}
                </Link>
                <span className="text-xs text-stone-400 shrink-0">
                  {formatDate(c.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-700 whitespace-pre-wrap line-clamp-3">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {hasMore && comments.length > 0 && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isPending}
          className="mt-3 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {isPending ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </section>
  );
}
