import Link from "next/link";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenrePodcastsLoadMore from "@/components/discover/GenrePodcastsLoadMore";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { MicrophoneIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { PodcastSearchItem } from "@/types/podcast";

interface GenrePodcastsSectionProps {
  genre: string;
  genreName: string | undefined;
  podcasts: PodcastSearchItem[];
  total: number;
  error: boolean;
}

export default function GenrePodcastsSection({
  genre,
  genreName,
  podcasts,
  total,
  error,
}: GenrePodcastsSectionProps) {
  return (
    <>
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        ジャンル一覧に戻る
      </Link>

      <h2 className="text-lg font-bold text-stone-900 mb-4">
        {genreName ?? genre}の番組
      </h2>

      {error ? (
        <ErrorMessage message="番組の取得に失敗しました" />
      ) : podcasts.length === 0 ? (
        <EmptyState
          icon={<MicrophoneIcon className="h-12 w-12" />}
          message="このジャンルの番組はまだありません"
          description="他のジャンルを探してみましょう"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))}
          </div>

          <GenrePodcastsLoadMore
            genre={genre}
            initialCount={podcasts.length}
            total={total}
          />
        </>
      )}
    </>
  );
}
