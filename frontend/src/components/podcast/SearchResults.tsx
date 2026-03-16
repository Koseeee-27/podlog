import type { PodcastSearchItem } from "@/types/podcast";
import PodcastCard from "./PodcastCard";
import ErrorMessage from "@/components/ui/ErrorMessage";

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
      <div className="text-center py-12 text-stone-500">
        <svg className="mx-auto h-12 w-12 text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p>ポッドキャスト名で検索してみましょう</p>
      </div>
    );
  }

  if (!loading && results.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p>&ldquo;{query}&rdquo; に一致するポッドキャストが見つかりませんでした</p>
      </div>
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
