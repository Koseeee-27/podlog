import { serverGet } from "@/lib/api/server";
import DiscoverClient from "./DiscoverClient";
import type { PodcastSearchItem, PodcastSearchResult } from "@/types/podcast";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";

  // 初期クエリがあればサーバーサイドで検索（失敗時は空配列にフォールバック）
  let initialResults: PodcastSearchItem[] = [];
  if (query) {
    try {
      const result = await serverGet<PodcastSearchResult>(
        `/podcasts/search?q=${encodeURIComponent(query)}`,
        { noAuth: true, revalidate: 0 },
      );
      initialResults = result.podcasts;
    } catch {
      // エラー時は空配列 — クライアント側で再検索可能
    }
  }

  return (
    <DiscoverClient
      key={query}
      initialQuery={query}
      initialResults={initialResults}
    />
  );
}
