import { getPodcastEpisodes } from "@/lib/data/podcasts";
import EpisodeListClient from "./EpisodeListClient";

interface EpisodeSectionProps {
  podcastId: string;
}

/**
 * エピソード一覧の Server Component。
 * エピソード初期データを取得し、EpisodeListClient に渡す。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 *
 * `GET /podcasts/:id/episodes` はオプショナル認証エンドポイント。
 * ログイン中は `getPodcastEpisodes` が Authorization ヘッダーを付与して
 * ユーザー固有の「聴取済み」情報を取得する (Authorization 付きのときは
 * `cache: "no-store"`、未ログイン時は `revalidate: 60`)。
 */
export default async function EpisodeSection({ podcastId }: EpisodeSectionProps) {
  const result = await getPodcastEpisodes(podcastId, 20, 0);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-stone-900 mb-4">エピソード</h2>
      <EpisodeListClient
        podcastId={podcastId}
        initialEpisodes={result.episodes}
        initialTotal={result.total}
      />
    </div>
  );
}
