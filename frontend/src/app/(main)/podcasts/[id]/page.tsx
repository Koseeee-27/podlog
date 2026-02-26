"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const PodcastPageClient = dynamic(() => import("./PodcastPageClient"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function PodcastPage() {
  return <PodcastPageClient />;
}
