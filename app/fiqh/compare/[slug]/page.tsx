import { permanentRedirect } from 'next/navigation';

/** Legacy URL — the canonical page is /compare/[slug]. */
export default async function LegacyRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/compare/${encodeURIComponent(decodeURIComponent(slug))}`);
}
