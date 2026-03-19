import TimelineCard from "@/components/timeline/TimelineCard";
import EmptyState from "@/components/ui/EmptyState";
import TimelineLoadMore from "@/components/home/TimelineLoadMore";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { serverGet } from "@/lib/api/server";
import type { TimelineResult } from "@/types/review";

const PAGE_SIZE = 20;

interface TimelineSectionProps {
  headingLevel?: "h1" | "h2";
}

export default async function TimelineSection({
  headingLevel = "h2",
}: TimelineSectionProps) {
  const Heading = headingLevel;

  let data: TimelineResult;
  try {
    data = await serverGet<TimelineResult>(
      `/timeline?limit=${PAGE_SIZE}&offset=0`,
      { revalidate: 60, tags: ["timeline"], noAuth: true }
    );
  } catch (error) {
    console.error("TimelineSection: タイムラインの取得に失敗しました", error);
    return (
      <section>
        <Heading className="text-lg font-bold text-stone-900 mb-4">
          みんなのレビュー
        </Heading>
        <p className="text-sm text-red-600">
          タイムラインの読み込みに失敗しました
        </p>
      </section>
    );
  }

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
