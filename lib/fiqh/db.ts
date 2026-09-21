import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import type {
  CompareSummary,
  Fatwa,
  FiqhCategory,
  FiqhCorpusStats,
  FiqhPrinciple,
  FiqhQuestion,
  FiqhSearchHit,
  FiqhSubcategory,
  Marja,
  RulingType,
} from './types';

type MarjaRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  era: Marja['era'];
  bio_en: string | null;
  bio_ar: string | null;
  website_url: string | null;
  order_index: number;
};

type CategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  order_index: number;
};

type SubcategoryRow = {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  order_index: number;
};

type QuestionRow = {
  id: string;
  subcategory_id: string;
  slug: string;
  question_en: string;
  question_ar: string | null;
  keywords: string[] | null;
  difficulty: FiqhQuestion['difficulty'];
};

type FatwaRow = {
  id: string;
  question_id: string;
  marja_id: string;
  ruling_type: RulingType;
  answer_en: string;
  answer_ar: string | null;
  conditions_en: string | null;
  conditions_ar: string | null;
  evidence_refs: unknown;
  maraji?: MarjaRow | MarjaRow[] | null;
};

function marjaFromRow(r: MarjaRow): Marja {
  return {
    id: r.id,
    slug: r.slug,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    era: r.era,
    bioEn: r.bio_en,
    bioAr: r.bio_ar,
    websiteUrl: r.website_url,
    orderIndex: r.order_index,
  };
}

function categoryFromRow(r: CategoryRow): FiqhCategory {
  return {
    id: r.id,
    slug: r.slug,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    descriptionEn: r.description_en,
    orderIndex: r.order_index,
  };
}

function subcategoryFromRow(r: SubcategoryRow, extra?: { categorySlug?: string }): FiqhSubcategory {
  return {
    id: r.id,
    categoryId: r.category_id,
    slug: r.slug,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    orderIndex: r.order_index,
    categorySlug: extra?.categorySlug,
  };
}

function questionFromRow(
  r: QuestionRow,
  extra?: { subcategorySlug?: string; categorySlug?: string },
): FiqhQuestion {
  return {
    id: r.id,
    subcategoryId: r.subcategory_id,
    slug: r.slug,
    questionEn: r.question_en,
    questionAr: r.question_ar,
    keywords: r.keywords ?? [],
    difficulty: r.difficulty,
    subcategorySlug: extra?.subcategorySlug,
    categorySlug: extra?.categorySlug,
  };
}

function fatwaFromRow(r: FatwaRow): Fatwa {
  const joined = r.maraji;
  const marjaRow = Array.isArray(joined) ? joined[0] : joined;
  return {
    id: r.id,
    questionId: r.question_id,
    marjaId: r.marja_id,
    rulingType: r.ruling_type,
    answerEn: r.answer_en,
    answerAr: r.answer_ar,
    conditionsEn: r.conditions_en,
    conditionsAr: r.conditions_ar,
    evidenceRefs: Array.isArray(r.evidence_refs) ? r.evidence_refs : [],
    marja: marjaRow ? marjaFromRow(marjaRow) : undefined,
  };
}

export async function fiqhTablesReady(): Promise<boolean> {
  const { error } = await supabase.from('maraji').select('id').limit(1);
  return !error;
}

export async function listMaraji(): Promise<Marja[]> {
  const { data, error } = await supabase.from('maraji').select('*').order('order_index');
  if (error) throw error;
  return (data as MarjaRow[]).map(marjaFromRow);
}

export async function getMarjaBySlug(slug: string): Promise<Marja | null> {
  const { data, error } = await supabase.from('maraji').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? marjaFromRow(data as MarjaRow) : null;
}

export async function listCategories(): Promise<FiqhCategory[]> {
  const { data, error } = await supabase.from('fiqh_categories').select('*').order('order_index');
  if (error) throw error;
  return (data as CategoryRow[]).map(categoryFromRow);
}

export async function getCategoryBySlug(slug: string): Promise<FiqhCategory | null> {
  const { data, error } = await supabase
    .from('fiqh_categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? categoryFromRow(data as CategoryRow) : null;
}

export async function listSubcategories(categoryId?: string): Promise<FiqhSubcategory[]> {
  let q = supabase
    .from('fiqh_subcategories')
    .select('*, fiqh_categories!inner(slug)')
    .order('order_index');
  if (categoryId) q = q.eq('category_id', categoryId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const cat = row.fiqh_categories as { slug: string } | { slug: string }[];
    const categorySlug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug;
    const { fiqh_categories: _, ...sub } = row;
    return subcategoryFromRow(sub as SubcategoryRow, { categorySlug });
  });
}

export async function listQuestions(options: {
  subcategoryId?: string;
  categorySlug?: string;
  limit?: number;
  offset?: number;
}): Promise<FiqhQuestion[]> {
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;

  let q = supabase
    .from('fiqh_questions')
    .select('*, fiqh_subcategories!inner(slug, fiqh_categories!inner(slug))')
    .order('question_en')
    .range(offset, offset + limit - 1);

  if (options.subcategoryId) q = q.eq('subcategory_id', options.subcategoryId);
  if (options.categorySlug) {
    const cat = await getCategoryBySlug(options.categorySlug);
    if (!cat) return [];
    const subs = await listSubcategories(cat.id);
    const ids = subs.map((s) => s.id);
    if (ids.length === 0) return [];
    q = q.in('subcategory_id', ids);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const sub = row.fiqh_subcategories as {
      slug: string;
      fiqh_categories: { slug: string } | { slug: string }[];
    };
    const cat = sub.fiqh_categories;
    const categorySlug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug;
    const { fiqh_subcategories: _, ...question } = row;
    return questionFromRow(question as QuestionRow, {
      subcategorySlug: sub.slug,
      categorySlug,
    });
  });
}

export async function getQuestionBySlug(slug: string): Promise<FiqhQuestion | null> {
  const { data, error } = await supabase
    .from('fiqh_questions')
    .select('*, fiqh_subcategories!inner(slug, fiqh_categories!inner(slug))')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const sub = data.fiqh_subcategories as {
    slug: string;
    fiqh_categories: { slug: string } | { slug: string }[];
  };
  const cat = sub.fiqh_categories;
  const categorySlug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug;
  const { fiqh_subcategories: _, ...question } = data;
  return questionFromRow(question as QuestionRow, {
    subcategorySlug: sub.slug,
    categorySlug,
  });
}

export async function listFatwasForQuestion(questionId: string): Promise<Fatwa[]> {
  const { data, error } = await supabase
    .from('fatwas')
    .select('*, maraji(*)')
    .eq('question_id', questionId)
    .order('marja_id');
  if (error) throw error;
  return (data as FatwaRow[]).map(fatwaFromRow);
}

export async function compareQuestion(slug: string): Promise<CompareSummary | null> {
  const question = await getQuestionBySlug(slug);
  if (!question) return null;

  const fatwas = await listFatwasForQuestion(question.id);
  const rulingCounts: Record<string, number> = {};
  for (const f of fatwas) {
    rulingCounts[f.rulingType] = (rulingCounts[f.rulingType] ?? 0) + 1;
  }

  let dominantRuling: RulingType | null = null;
  let max = 0;
  for (const [type, count] of Object.entries(rulingCounts)) {
    if (count > max) {
      max = count;
      dominantRuling = type as RulingType;
    }
  }

  const unanimous =
    fatwas.length > 0 && Object.keys(rulingCounts).length === 1;

  return {
    question,
    fatwas,
    agreement: { dominantRuling, unanimous, rulingCounts },
  };
}

export async function searchFiqh(
  query: string,
  limit = 20,
  filterCategoryId?: string,
  filterMarjaId?: string,
): Promise<FiqhSearchHit[]> {
  const hits = await searchFiqhOnce(query, limit, filterCategoryId, filterMarjaId);
  return hits;
}

async function searchFiqhOnce(
  query: string,
  limit: number,
  filterCategoryId?: string,
  filterMarjaId?: string,
): Promise<FiqhSearchHit[]> {
  const { data, error } = await supabase.rpc('search_fiqh', {
    query_text: query,
    match_count: limit,
    filter_category_id: filterCategoryId ?? null,
    filter_marja_id: filterMarjaId ?? null,
  });
  if (error) throw error;

  return mapSearchRows(data);
}

function mapSearchRows(data: unknown): FiqhSearchHit[] {
  const rows = Array.isArray(data) ? data : [];
  return rows.map(
    (r: {
      question_id: string;
      question_slug: string;
      question_en: string;
      question_ar: string | null;
      subcategory_slug: string;
      category_slug: string;
      rank: number;
      top_ruling_type: RulingType | null;
      marja_count: number;
    }) => ({
      questionId: r.question_id,
      questionSlug: r.question_slug,
      questionEn: r.question_en,
      questionAr: r.question_ar,
      subcategorySlug: r.subcategory_slug,
      categorySlug: r.category_slug,
      rank: r.rank,
      topRulingType: r.top_ruling_type,
      marjaCount: Number(r.marja_count),
    }),
  );
}

/** Tries synonym/typo variants and merges hits (for chat + search). */
export async function searchFiqhRobust(
  query: string,
  limit = 20,
  filterCategoryId?: string,
  filterMarjaId?: string,
): Promise<FiqhSearchHit[]> {
  const { expandQueryVariants } = await import('./query-expand');
  const byId = new Map<string, FiqhSearchHit>();

  for (const variant of expandQueryVariants(query)) {
    const batch = await searchFiqhOnce(variant, limit, filterCategoryId, filterMarjaId);
    for (const h of batch) {
      const prev = byId.get(h.questionId);
      if (!prev || h.rank > prev.rank) byId.set(h.questionId, h);
    }
    if (byId.size >= limit) break;
  }

  const merged = [...byId.values()].sort((a, b) => b.rank - a.rank);
  if (merged.length > 0) return merged.slice(0, limit);

  const { tokensForFallback } = await import('./query-expand');
  const tokens = tokensForFallback(query);
  if (tokens.length === 0) return [];

  const orParts = tokens.map((t) => `question_en.ilike.%${t.replace(/[%_,]/g, '')}%`);
  const { data, error } = await supabase
    .from('fiqh_questions')
    .select('id, slug, question_en, question_ar, fiqh_subcategories!inner(slug, fiqh_categories!inner(slug))')
    .or(orParts.slice(0, 12).join(','))
    .limit(limit);
  if (error || !data?.length) return [];

  const hits: FiqhSearchHit[] = [];
  for (const row of data) {
    const sub = row.fiqh_subcategories as unknown as {
      slug: string;
      fiqh_categories: { slug: string } | { slug: string }[];
    };
    const cat = sub.fiqh_categories;
    const categorySlug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug;
    const { count } = await supabase
      .from('fatwas')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', row.id as string);
    hits.push({
      questionId: row.id as string,
      questionSlug: row.slug as string,
      questionEn: row.question_en as string,
      questionAr: (row.question_ar as string | null) ?? null,
      subcategorySlug: sub.slug,
      categorySlug: categorySlug ?? 'worship',
      rank: 0.1,
      topRulingType: null,
      marjaCount: count ?? 0,
    });
  }
  return hits;
}

export async function listPrinciples(): Promise<FiqhPrinciple[]> {
  const { data, error } = await supabase.from('fiqh_principles').select('*').order('order_index');
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      slug: string;
      name_en: string;
      name_ar: string | null;
      explanation_en: string;
      explanation_ar: string | null;
      related_category_slugs: string[] | null;
      order_index: number;
    }) => ({
      id: r.id,
      slug: r.slug,
      nameEn: r.name_en,
      nameAr: r.name_ar,
      explanationEn: r.explanation_en,
      explanationAr: r.explanation_ar,
      relatedCategorySlugs: r.related_category_slugs ?? [],
      orderIndex: r.order_index,
    }),
  );
}

export async function getCorpusStats(): Promise<FiqhCorpusStats | null> {
  if (!(await fiqhTablesReady())) return null;

  const [maraji, categories, subcategories, questions, fatwas, principles, links] =
    await Promise.all([
      supabase.from('maraji').select('*', { count: 'exact', head: true }),
      supabase.from('fiqh_categories').select('*', { count: 'exact', head: true }),
      supabase.from('fiqh_subcategories').select('*', { count: 'exact', head: true }),
      supabase.from('fiqh_questions').select('*', { count: 'exact', head: true }),
      supabase.from('fatwas').select('*', { count: 'exact', head: true }),
      supabase.from('fiqh_principles').select('*', { count: 'exact', head: true }),
      supabase.from('fiqh_question_links').select('*', { count: 'exact', head: true }),
    ]);

  if (maraji.error) return null;

  return {
    maraji: maraji.count ?? 0,
    categories: categories.count ?? 0,
    subcategories: subcategories.count ?? 0,
    questions: questions.count ?? 0,
    fatwas: fatwas.count ?? 0,
    principles: principles.count ?? 0,
    questionLinks: links.count ?? 0,
  };
}
