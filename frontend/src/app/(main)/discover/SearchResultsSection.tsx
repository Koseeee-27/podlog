import PodcastCard from "@/components/podcast/PodcastCard";
import EmptyState from "@/components/ui/EmptyState";
import PodcastRequestPrompt from "./PodcastRequestPrompt";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { PodcastSearchItem } from "@/types/podcast";

interface SearchResultsSectionProps {
  query: string;
  results: PodcastSearchItem[];
}

export default function SearchResultsSection({
  query,
  results,
}: SearchResultsSectionProps) {
  if (results.length === 0) {
    return (
      <>
        <EmptyState
          icon={<MagnifyingGlassIcon className="h-12 w-12" />}
          message={`"${query}" に一致するポッドキャストが見つかりませんでした`}
          description="別のキーワードで試してみてください"
        />
        <PodcastRequestPrompt />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
}
