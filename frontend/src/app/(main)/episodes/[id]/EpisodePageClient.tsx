"use client";

import { useParams } from "next/navigation";
import { useEpisode } from "@/hooks/useEpisodes";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EpisodeDetail from "@/components/episode/EpisodeDetail";

export default function EpisodePageClient() {
  const params = useParams();
  const id = params.id as string;
  const { episode, loading, error } = useEpisode(id);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!episode) {
    return <ErrorMessage message="エピソードが見つかりません" />;
  }

  return <EpisodeDetail episode={episode} />;
}
