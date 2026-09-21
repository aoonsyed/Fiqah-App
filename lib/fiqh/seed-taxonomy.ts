import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import { CATEGORIES, LEGAL_PRINCIPLES, MARAJI } from './catalog';

const BATCH = 500;

async function insertBatch(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + BATCH) as never[]);
    if (error) throw error;
  }
}

export async function wipeFiqhCorpus() {
  const tables = [
    'fiqh_question_links',
    'fatwas',
    'fiqh_questions',
    'fiqh_principles',
    'fiqh_subcategories',
    'fiqh_categories',
    'maraji',
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) continue;
    const msg = error.message ?? '';
    if (msg.includes('does not exist') || error.code === 'PGRST205') continue;
    throw error;
  }
}

/** Insert any maraji from catalog missing in DB (safe on existing corpus). */
export async function upsertCatalogMaraji(): Promise<Map<string, string>> {
  for (const m of MARAJI) {
    const { error } = await supabase.from('maraji').upsert(
      {
        slug: m.slug,
        name_en: m.nameEn,
        name_ar: m.nameAr,
        era: m.era,
        bio_en: m.bioEn,
        website_url: m.websiteUrl ?? null,
        order_index: m.orderIndex,
      },
      { onConflict: 'slug' },
    );
    if (error) throw error;
  }
  const { data, error } = await supabase.from('maraji').select('id, slug');
  if (error) throw error;
  return new Map(data!.map((r) => [r.slug, r.id as string]));
}

export async function loadTaxonomyMaps(): Promise<{
  marjaBySlug: Map<string, string>;
  subIdBySlug: Map<string, string>;
}> {
  const marjaBySlug = await upsertCatalogMaraji();
  const { data: subDb, error } = await supabase.from('fiqh_subcategories').select('id, slug');
  if (error) throw error;
  return { marjaBySlug, subIdBySlug: new Map(subDb!.map((r) => [r.slug, r.id as string])) };
}

export async function seedTaxonomy(): Promise<{
  marjaBySlug: Map<string, string>;
  subIdBySlug: Map<string, string>;
}> {
  await insertBatch(
    'maraji',
    MARAJI.map((m) => ({
      slug: m.slug,
      name_en: m.nameEn,
      name_ar: m.nameAr,
      era: m.era,
      bio_en: m.bioEn,
      website_url: m.websiteUrl ?? null,
      order_index: m.orderIndex,
    })),
  );

  await insertBatch(
    'fiqh_categories',
    CATEGORIES.map((c) => ({
      slug: c.slug,
      name_en: c.nameEn,
      name_ar: c.nameAr,
      description_en: c.descriptionEn,
      order_index: c.orderIndex,
    })),
  );

  const { data: catRows, error: catErr } = await supabase.from('fiqh_categories').select('id, slug');
  if (catErr) throw catErr;
  const catId = new Map(catRows!.map((r) => [r.slug, r.id as string]));

  const subRows: Record<string, unknown>[] = [];
  for (const c of CATEGORIES) {
    c.subcategories.forEach((sub, idx) => {
      subRows.push({
        category_id: catId.get(c.slug),
        slug: sub.slug,
        name_en: sub.nameEn,
        name_ar: sub.nameAr,
        order_index: idx + 1,
      });
    });
  }
  await insertBatch('fiqh_subcategories', subRows);

  await insertBatch(
    'fiqh_principles',
    LEGAL_PRINCIPLES.map((p) => ({
      slug: p.slug,
      name_en: p.nameEn,
      name_ar: p.nameAr,
      explanation_en: p.explanationEn,
      related_category_slugs: p.relatedCategorySlugs,
      order_index: p.orderIndex,
    })),
  );

  const { data: marjaRows } = await supabase.from('maraji').select('id, slug');
  const { data: subDb } = await supabase.from('fiqh_subcategories').select('id, slug');

  return {
    marjaBySlug: new Map(marjaRows!.map((r) => [r.slug, r.id as string])),
    subIdBySlug: new Map(subDb!.map((r) => [r.slug, r.id as string])),
  };
}
