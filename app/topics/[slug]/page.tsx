import type { Metadata } from 'next';
import { TopicView } from '@/app/components/TopicView';
import { CATEGORIES } from '@/lib/fiqh/catalog';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) return { title: 'Topic' };
  return {
    title: `${category.nameEn} — rulings`,
    description: category.descriptionEn || `Shia fiqh rulings on ${category.nameEn.toLowerCase()} from the maraji.`,
  };
}

export default function TopicPage() {
  return <TopicView />;
}
