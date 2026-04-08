import PodcastCard from "@/components/podcast/PodcastCard";
import GenreGrid from "@/components/discover/GenreGrid";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { PodcastSearchItem } from "@/types/podcast";
import type { Genre } from "@/types/genre";

interface DefaultSectionProps {
  genres: Genre[];
  genresError: boolean;
  popularPodcasts: PodcastSearchItem[];
  popularError: boolean;
}

export default function DefaultSection({
  genres,
  genresError,
  popularPodcasts,
  popularError,
}: DefaultSectionProps) {
  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-4">
          ジャンルから探す
        </h2>
        {genresError ? (
          <ErrorMessage message="ジャンルの取得に失敗しました" />
        ) : (
          <GenreGrid genres={genres} />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-stone-900 mb-4">人気の番組</h2>

        {popularError ? (
          <ErrorMessage message="人気の番組の取得に失敗しました" />
        ) : popularPodcasts.length === 0 ? (
          <p className="text-sm text-stone-500">
            まだレビューのある番組がありません
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularPodcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
