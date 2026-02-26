import type { Episode } from "@/types/episode";
import EpisodeCard from "./EpisodeCard";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";

interface EpisodeListProps {
  episodes: Episode[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function EpisodeList({ episodes, loading, hasMore, onLoadMore }: EpisodeListProps) {
  if (loading && episodes.length === 0) {
    return <Loading message="エピソードを読み込み中..." />;
  }

  if (episodes.length === 0) {
    return <p className="text-center py-8 text-gray-500">エピソードはまだ登録されていません</p>;
  }

  return (
    <div>
      <div className="space-y-2">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={onLoadMore} loading={loading}>
            もっと読み込む
          </Button>
        </div>
      )}
    </div>
  );
}
