import { redirect } from 'next/navigation';

export default async function LegacyFiqhSearch({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
}
