import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import { uuidSchema } from "@/lib/schemas/common";
import EpisodeDetail from "@/components/episode/EpisodeDetail";
import type { EpisodeWithStats } from "@/types/episode";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;

  // UUID 形式でなければ 404
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  let episode: EpisodeWithStats;
  try {
    episode = await serverGet<EpisodeWithStats>(
      `/episodes/${encodeURIComponent(id)}`,
      { noAuth: true, revalidate: 60 },
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <EpisodeDetail key={episode.id} episode={episode} isLoggedIn={isLoggedIn} />
  );
}
