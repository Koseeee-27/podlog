import type { Metadata } from "next";
import { Suspense } from "react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";
import DiscoverSearchBar from "./DiscoverSearchBar";
import SearchResultsSection from "./SearchResultsSection";
import GenrePodcastsSection from "./GenrePodcastsSection";
import DefaultSection from "./DefaultSection";
import {
  SearchResultsSkeleton,
  GenrePodcastsSkeleton,
  DefaultSectionSkeleton,
} from "./skeletons";

const PAGE_TITLE = "探す | PodLog";
const PAGE_DESCRIPTION =
  "PodLog で新しいラジオ・ポッドキャスト番組を探します。キーワード検索やジャンル別ブラウズで、人気の番組と出会えます。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    // クエリパラメータ（q / genre）は正規 URL から除外し、本体 `/discover` に集約する
    canonical: "/discover",
  },
  // openGraph / twitter は Next.js の shallow merge で親の値が**置換される**ため、
  // defaultOpenGraph / defaultTwitter を spread して og-default.png 等を継承させる
  openGraph: {
    ...defaultOpenGraph,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/discover",
  },
  twitter: {
    ...defaultTwitter,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

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
          <ErrorBoundary key={query}>
            <Suspense fallback={<SearchResultsSkeleton />}>
              <SearchResultsSection query={query} />
            </Suspense>
          </ErrorBoundary>
        ) : genre ? (
          <ErrorBoundary key={genre}>
            <Suspense fallback={<GenrePodcastsSkeleton />}>
              <GenrePodcastsSection genre={genre} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <ErrorBoundary key="default">
            <Suspense fallback={<DefaultSectionSkeleton />}>
              <DefaultSection />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </>
  );
}
