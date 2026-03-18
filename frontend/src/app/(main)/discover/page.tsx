import DiscoverClient from "./DiscoverClient";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { q } = await searchParams;
  return <DiscoverClient initialQuery={q ?? ""} />;
}
