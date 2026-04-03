import { notFound } from "next/navigation";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import { uuidSchema } from "@/lib/schemas/common";
import EpisodeDetail from "@/components/episode/EpisodeDetail";
import type { EpisodeDetailResult } from "@/types/episode";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;

  // UUID 形式でなければ 404
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  let episode: EpisodeDetailResult;
  try {
    episode = await serverGet<EpisodeDetailResult>(
      `/episodes/${encodeURIComponent(id)}`,
      { noAuth: true, revalidate: 60 },
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return <EpisodeDetail key={episode.id} episode={episode} />;
}
