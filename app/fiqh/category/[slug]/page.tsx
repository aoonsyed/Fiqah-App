import { permanentRedirect } from 'next/navigation';

/** Legacy URL — the canonical page is /topics/[slug]. */
export default async function LegacyRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/topics/${encodeURIComponent(decodeURIComponent(slug))}`);
}
