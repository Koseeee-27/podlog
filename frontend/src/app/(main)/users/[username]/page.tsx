import { notFound } from "next/navigation";
import { usernameSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import PublicProfileClient from "./PublicProfileClient";
import type { UserPublicProfile } from "@/types/user";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  if (!usernameSchema.safeParse(username).success) {
    notFound();
  }

  let profile: UserPublicProfile;
  try {
    profile = await serverGet<UserPublicProfile>(
      `/users/${encodeURIComponent(username)}`,
      { noAuth: true, revalidate: 60 },
    );
  } catch {
    notFound();
  }

  return <PublicProfileClient username={username} initialProfile={profile} />;
}
