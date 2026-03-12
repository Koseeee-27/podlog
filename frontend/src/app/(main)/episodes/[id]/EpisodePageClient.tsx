"use client";

import { useEpisode } from "@/hooks/useEpisodes";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EpisodeDetail from "@/components/episode/EpisodeDetail";

interface EpisodePageClientProps {
  episodeId: string;
  isLoggedIn: boolean;
}

export default function EpisodePageClient({
  episodeId,
  isLoggedIn,
}: EpisodePageClientProps) {
  const { episode, loading, error } = useEpisode(episodeId);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!episode) {
    return <ErrorMessage message="エピソードが見つかりません" />;
  }

  return <EpisodeDetail episode={episode} isLoggedIn={isLoggedIn} />;
}
