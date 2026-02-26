"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const ProfileClient = dynamic(() => import("./ProfileClient"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function ProfilePage() {
  return <ProfileClient />;
}
