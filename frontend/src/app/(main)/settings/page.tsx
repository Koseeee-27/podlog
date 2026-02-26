"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const SettingsClient = dynamic(() => import("./SettingsClient"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function SettingsPage() {
  return <SettingsClient />;
}
