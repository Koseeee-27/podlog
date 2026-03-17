"use client";

import { usePodcastSearch } from "@/hooks/usePodcastSearch";
import SearchBar from "@/components/podcast/SearchBar";
import SearchResults from "@/components/podcast/SearchResults";

// TODO: URL の ?q= パラメータを読み取り、ヘッダー検索バーからの遷移に対応する（#100）
export default function SearchClient() {
  const { query, setQuery, results, loading: searchLoading, error } = usePodcastSearch();

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">番組を探す</h1>
      <SearchBar value={query} onChange={setQuery} loading={searchLoading} />
      <div className="mt-6">
        <SearchResults results={results} query={query} loading={searchLoading} error={error} />
      </div>
    </div>
  );
}
