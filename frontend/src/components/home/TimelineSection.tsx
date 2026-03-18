"use client";

import { useTimeline } from "@/hooks/useReviews";
import TimelineCard from "@/components/timeline/TimelineCard";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

interface TimelineSectionProps {
  headingLevel?: "h1" | "h2";
}

export default function TimelineSection({ headingLevel = "h2" }: TimelineSectionProps) {
  const { reviews, loading, error, hasMore, loadMore } = useTimeline();
  const Heading = headingLevel;

  return (
    <section>
      <Heading className="text-lg font-bold text-stone-900 mb-4">みんなのレビュー</Heading>

      {loading && reviews.length === 0 && <Loading />}
      {error && <ErrorMessage message={error} />}

      {!loading && reviews.length === 0 && !error && (
        <EmptyState
          icon={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
          message="まだレビューがありません"
          description="最初のレビューを書いてみましょう！"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reviews.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && reviews.length > 0 && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </section>
  );
}
