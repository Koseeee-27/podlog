import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  redirect(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
}
