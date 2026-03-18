import DiscoverClient from "./DiscoverClient";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  return <DiscoverClient initialQuery={query} />;
}
