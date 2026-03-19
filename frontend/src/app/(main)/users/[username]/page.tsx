import { notFound } from "next/navigation";
import { usernameSchema } from "@/lib/schemas/common";
import PublicProfileClient from "./PublicProfileClient";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  if (!usernameSchema.safeParse(username).success) {
    notFound();
  }

  return <PublicProfileClient username={username} />;
}
