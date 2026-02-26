"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const EpisodePageClient = dynamic(() => import("./EpisodePageClient"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function EpisodePage() {
  return <EpisodePageClient />;
}
