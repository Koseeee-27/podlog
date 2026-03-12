import { createClient } from "@/lib/supabase/server";
import EpisodePageClient from "./EpisodePageClient";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return <EpisodePageClient episodeId={id} isLoggedIn={isLoggedIn} />;
}
