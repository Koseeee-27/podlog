import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/schemas/common";
import PodcastPageClient from "./PodcastPageClient";

interface PodcastPageProps {
  params: Promise<{ id: string }>;
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { id } = await params;

  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  return <PodcastPageClient id={id} />;
}
