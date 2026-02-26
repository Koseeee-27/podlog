"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const ProfileSetupClient = dynamic(
  () => import("./ProfileSetupClient"),
  { ssr: false, loading: () => <Loading /> }
);

export default function ProfileSetupPage() {
  return <ProfileSetupClient />;
}
