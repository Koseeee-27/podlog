import Link from "next/link";
import type { UserReviewItem } from "@/types/review";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import { BookOpenIcon } from "@heroicons/react/24/outline";

interface UserReviewListProps {
  reviews: UserReviewItem[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function UserReviewList({
  reviews,
  total,
  loading,
  hasMore,
  onLoadMore,
}: UserReviewListProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-stone-900">レビュー</h2>
        {total > 0 && <span className="text-sm text-stone-500">{total}件</span>}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<BookOpenIcon className="h-12 w-12" />}
          message="まだレビューがありません"
          description="聴いたエピソードの感想を書いてみましょう"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <Link
                  href={`/episodes/${review.episode.id}`}
                  className="text-sm font-medium text-stone-900 hover:text-rose-600"
                >
                  {review.episode.title}
                </Link>
                <span className="text-sm text-yellow-500 shrink-0 ml-2">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Link
                  href={`/podcasts/${review.podcast.id}`}
                  className="text-xs text-stone-500 hover:text-rose-600"
                >
                  {review.podcast.title}
                </Link>
                <span className="text-xs text-stone-400">{formatDate(review.created_at)}</span>
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-stone-700 whitespace-pre-wrap line-clamp-3">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && reviews.length > 0 && (
        <button
          type="button"
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
