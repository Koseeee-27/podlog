"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/ui/Loading";

const DashboardClient = dynamic(
  () => import("./DashboardClient"),
  { ssr: false, loading: () => <Loading /> }
);

export default function DashboardPage() {
  return <DashboardClient />;
}
