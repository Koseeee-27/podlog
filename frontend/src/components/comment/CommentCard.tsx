/**
 * 1 件の感想カード（エピソード詳細・ユーザーページの一覧で使用）。
 *
 * `EpisodeCommentItem`（user 情報付き）を表示する想定。投稿者の avatar / 表示名 /
 * 投稿日時 / 本文を 1 つのカードに収める。BE は `display_name` / `avatar_url` を
 * `omitempty` で返すため、未設定時は username を fallback に使う。
 */
import Link from "next/link";
import type { EpisodeCommentItem } from "@/types/comment";
import Avatar from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";

interface CommentCardProps {
  comment: EpisodeCommentItem;
}

export default function CommentCard({ comment }: CommentCardProps) {
  // BE は display_name を omitempty で返すため、未設定時は username を fallback
  const displayName = comment.user.display_name ?? comment.user.username;

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar
          src={comment.user.avatar_url ?? null}
          alt={displayName}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/users/${comment.user.username}`}
            className="block truncate text-sm font-medium text-stone-900 hover:text-rose-600"
          >
            {displayName}
          </Link>
          <p className="text-xs text-stone-500">
            {formatDate(comment.created_at)}
          </p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">
        {comment.body}
      </p>
    </article>
  );
}
