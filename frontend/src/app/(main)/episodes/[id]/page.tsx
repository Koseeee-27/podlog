import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/common";
import EpisodePageClient from "./EpisodePageClient";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;

  // UUID 形式でなければ 404
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return <EpisodePageClient episodeId={id} isLoggedIn={isLoggedIn} />;
}
