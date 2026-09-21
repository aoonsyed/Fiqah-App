export type MarjaEra = 'contemporary' | 'classical' | 'historical';

export type RulingType =
  | 'wajib'
  | 'mustahab'
  | 'mubah'
  | 'makruh'
  | 'haram'
  | 'conditional'
  | 'informational'
  | 'disputed';

export type QuestionDifficulty = 'basic' | 'general' | 'advanced';

export type QuestionLinkType = 'related' | 'prerequisite' | 'contrast' | 'see_also';

export interface Marja {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  era: MarjaEra;
  bioEn: string | null;
  bioAr: string | null;
  websiteUrl: string | null;
  orderIndex: number;
}

export interface FiqhCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  orderIndex: number;
  subcategoryCount?: number;
  questionCount?: number;
}

export interface FiqhSubcategory {
  id: string;
  categoryId: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  orderIndex: number;
  categorySlug?: string;
  questionCount?: number;
}

export interface FiqhQuestion {
  id: string;
  subcategoryId: string;
  slug: string;
  questionEn: string;
  questionAr: string | null;
  keywords: string[];
  difficulty: QuestionDifficulty;
  subcategorySlug?: string;
  categorySlug?: string;
}

export interface Fatwa {
  id: string;
  questionId: string;
  marjaId: string;
  rulingType: RulingType;
  answerEn: string;
  answerAr: string | null;
  conditionsEn: string | null;
  conditionsAr: string | null;
  evidenceRefs: unknown[];
  marja?: Marja;
}

export interface FiqhPrinciple {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  explanationEn: string;
  explanationAr: string | null;
  relatedCategorySlugs: string[];
  orderIndex: number;
}

export interface FiqhSearchHit {
  questionId: string;
  questionSlug: string;
  questionEn: string;
  questionAr: string | null;
  subcategorySlug: string;
  categorySlug: string;
  rank: number;
  topRulingType: RulingType | null;
  marjaCount: number;
}

export interface FiqhCorpusStats {
  maraji: number;
  categories: number;
  subcategories: number;
  questions: number;
  fatwas: number;
  principles: number;
  questionLinks: number;
}

export interface CompareSummary {
  question: FiqhQuestion;
  fatwas: Fatwa[];
  agreement: {
    dominantRuling: RulingType | null;
    unanimous: boolean;
    rulingCounts: Record<string, number>;
  };
}
