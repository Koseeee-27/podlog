"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePodcastSearch } from "@/hooks/usePodcastSearch";
import Loading from "@/components/ui/Loading";
import SearchBar from "@/components/podcast/SearchBar";
import SearchResults from "@/components/podcast/SearchResults";

export default function DashboardClient() {
  const auth = useAuth();
  const router = useRouter();
  const { query, setQuery, results, loading: searchLoading, error } = usePodcastSearch();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.push("/login");
    } else if (auth.status === "no_profile") {
      router.push("/profile/setup");
    }
  }, [auth.status, router]);

  if (auth.status === "loading" || auth.status === "unauthenticated" || auth.status === "no_profile") {
    return <Loading />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ポッドキャスト検索</h1>
      <SearchBar value={query} onChange={setQuery} loading={searchLoading} />
      <div className="mt-6">
        <SearchResults results={results} query={query} loading={searchLoading} error={error} />
      </div>
    </div>
  );
}
