import type { PodcastSearchItem } from "@/types/podcast";
import PodcastCard from "./PodcastCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface SearchResultsProps {
  results: PodcastSearchItem[];
  query: string;
  loading: boolean;
  error: string | null;
}

export default function SearchResults({ results, query, loading, error }: SearchResultsProps) {
  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!query.trim()) {
    return (
      <EmptyState
        icon={<MagnifyingGlassIcon className="h-12 w-12" />}
        message="ポッドキャスト名で検索してみましょう"
      />
    );
  }

  if (!loading && results.length === 0) {
    return (
      <EmptyState
        icon={<MagnifyingGlassIcon className="h-12 w-12" />}
        message={`"${query}" に一致するポッドキャストが見つかりませんでした`}
        description="別のキーワードで試してみてください"
      />
    );
  }

  return (
    <div className="space-y-3">
      {results.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
}
