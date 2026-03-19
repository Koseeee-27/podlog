import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
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

  // エピソードデータ取得と認証チェックを並列で実行
  const [episodeResult, supabase] = await Promise.all([
    serverGet<EpisodeWithStats>(`/episodes/${encodeURIComponent(id)}`, {
      noAuth: true,
      revalidate: 60,
    }).catch(() => null),
    createClient(),
  ]);

  if (!episodeResult) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return <EpisodeDetail key={episodeResult.id} episode={episodeResult} isLoggedIn={isLoggedIn} />;
}
