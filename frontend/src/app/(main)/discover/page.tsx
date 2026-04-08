import { Suspense } from "react";
import DiscoverSearchBar from "./DiscoverSearchBar";
import SearchResultsSection from "./SearchResultsSection";
import GenrePodcastsSection from "./GenrePodcastsSection";
import DefaultSection from "./DefaultSection";
import {
  SearchResultsSkeleton,
  GenrePodcastsSkeleton,
  DefaultSectionSkeleton,
} from "./skeletons";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string | string[]; genre?: string | string[] }>;
}

export default async function DiscoverPage({
  searchParams,
}: DiscoverPageProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const genre = Array.isArray(params.genre)
    ? (params.genre[0] ?? "")
    : (params.genre ?? "");

  return (
    <>
      <h1 className="sr-only">探す</h1>

      <DiscoverSearchBar initialQuery={query} />

      <div className="mt-6">
        {query ? (
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResultsSection query={query} />
          </Suspense>
        ) : genre ? (
          <Suspense fallback={<GenrePodcastsSkeleton />}>
            <GenrePodcastsSection genre={genre} />
          </Suspense>
        ) : (
          <Suspense fallback={<DefaultSectionSkeleton />}>
            <DefaultSection />
          </Suspense>
        )}
      </div>
    </>
  );
}
