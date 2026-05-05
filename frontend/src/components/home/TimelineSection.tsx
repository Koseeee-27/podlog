import TimelineCard from "@/components/timeline/TimelineCard";
import EmptyState from "@/components/ui/EmptyState";
import TimelineLoadMore from "@/components/home/TimelineLoadMore";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { getOldTimeline } from "@/lib/data/timeline";

const PAGE_SIZE = 20;

interface TimelineSectionProps {
  headingLevel?: "h1" | "h2";
}

export default async function TimelineSection({
  headingLevel = "h2",
}: TimelineSectionProps) {
  const Heading = headingLevel;

  // 取得失敗時は throw して ErrorBoundary に委譲する
  const data = await getOldTimeline(PAGE_SIZE, 0);

  const reviews = data.reviews ?? [];

  return (
    <section>
      <Heading className="text-lg font-bold text-stone-900 mb-4">
        みんなのレビュー
      </Heading>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
          message="まだレビューがありません"
          description="最初のレビューを書いてみましょう！"
          ctaLabel="番組を探す"
          ctaHref="/discover"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reviews.map((item) => (
              <TimelineCard key={item.id} item={item} />
            ))}
          </div>

          <TimelineLoadMore
            initialCount={reviews.length}
            total={data.total}
          />
        </>
      )}
    </section>
  );
}
