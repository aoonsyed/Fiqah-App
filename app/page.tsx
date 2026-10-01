import { FiqhHomeHub, type HomeData } from '@/app/components/FiqhHomeHub';
import { CATEGORIES, MARAJI } from '@/lib/fiqh/catalog';
import { getCorpusStats, listCategories, listMaraji, listPublishedCounts } from '@/lib/fiqh/db';
import { errorMessage } from '@/lib/errors';

// The corpus changes only when an import runs, so the page is built once and
// refreshed in the background at most hourly — it arrives complete, never "0 maraji".
export const revalidate = 3600;

async function loadHomeData(): Promise<HomeData> {
  try {
    const [stats, categories, maraji, published] = await Promise.all([
      getCorpusStats(),
      listCategories(),
      listMaraji(),
      listPublishedCounts(),
    ]);
    return {
      ready: (stats?.questions ?? 0) > 0,
      categories: categories.length ? categories : fallbackCategories(),
      maraji: maraji.length ? maraji : fallbackMaraji(),
      published,
      subcategories: stats?.subcategories ?? 0,
    };
  } catch (error) {
    console.error('Home data unavailable:', errorMessage(error));
    return { ready: false, categories: fallbackCategories(), maraji: fallbackMaraji(), published: [], subcategories: 0 };
  }
}

export default async function Home() {
  return <FiqhHomeHub data={await loadHomeData()} />;
}

function fallbackCategories(): HomeData['categories'] {
  return CATEGORIES.map((c) => ({
    id: c.slug,
    slug: c.slug,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    descriptionEn: c.descriptionEn,
    orderIndex: c.orderIndex,
  }));
}

function fallbackMaraji(): HomeData['maraji'] {
  return MARAJI.map((m) => ({
    id: m.slug,
    slug: m.slug,
    nameEn: m.nameEn,
    nameAr: m.nameAr,
    era: m.era,
    bioEn: m.bioEn,
    bioAr: null,
    websiteUrl: m.websiteUrl ?? null,
    orderIndex: m.orderIndex,
  }));
}
