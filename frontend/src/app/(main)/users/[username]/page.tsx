"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const PublicProfileClient = dynamic(() => import("./PublicProfileClient"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function PublicProfilePage() {
  return <PublicProfileClient />;
}
