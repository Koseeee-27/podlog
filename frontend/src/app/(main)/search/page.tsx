import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  redirect(query ? `/discover?q=${encodeURIComponent(query)}` : "/discover");
}
