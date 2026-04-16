import { searchPodcasts } from "@/lib/data/podcasts";
import { getViewer } from "@/lib/auth/getViewer";
import PodcastCard from "@/components/podcast/PodcastCard";
import EmptyState from "@/components/ui/EmptyState";
import PodcastRequestPrompt from "./PodcastRequestPrompt";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface SearchResultsSectionProps {
  query: string;
}

/**
 * 検索結果セクション。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 *
 * 0 件時の PodcastRequestPrompt にログイン状態を渡すため `getViewer()` を
 * 呼ぶ。`cache()` でメモ化されているので layout.tsx で既に呼ばれていても
 * 追加コストはほぼゼロ。
 */
export default async function SearchResultsSection({
  query,
}: SearchResultsSectionProps) {
  const [result, viewer] = await Promise.all([
    searchPodcasts({ q: query }),
    getViewer().catch((): { status: "guest" } => {
      console.error("[SearchResultsSection] getViewer failed, falling back to guest");
      return { status: "guest" };
    }),
  ]);
  const podcasts = result.podcasts;
  const isLoggedIn = viewer.status === "authenticated";

  if (podcasts.length === 0) {
    return (
      <>
        <EmptyState
          icon={<MagnifyingGlassIcon className="h-12 w-12" />}
          message={`"${query}" に一致するポッドキャストが見つかりませんでした`}
          description="別のキーワードで試してみてください"
        />
        <PodcastRequestPrompt isLoggedIn={isLoggedIn} />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {podcasts.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
}
