import type { RulingType } from './types';
import { CATEGORIES, LEGAL_PRINCIPLES, MARAJI, type CatalogSubcategory } from './catalog';

const QUESTION_TEMPLATES = [
  'What is the ruling on {topic} when {scenario}?',
  'Is {topic} permissible if {scenario}?',
  'How should a muqallid handle {topic} in the case of {scenario}?',
  'Does {topic} require ghusl or wudu when {scenario}?',
  'What are the conditions for {topic} if {scenario}?',
  'When is {topic} considered invalid due to {scenario}?',
  'Can {topic} be combined with {scenario} according to precaution?',
  'What is the kaffarah or expiation related to {topic} when {scenario}?',
];

const SCENARIOS = [
  'one is traveling',
  'time is limited before salah',
  'there is a medical necessity',
  'the act is done online',
  'a contract is unsigned',
  'there is reasonable doubt',
  'others may be harmed',
  'equipment is shared',
  'the matter is urgent',
  'local custom differs',
];

const RULING_TYPES: RulingType[] = [
  'wajib',
  'mustahab',
  'mubah',
  'makruh',
  'haram',
  'conditional',
  'informational',
  'disputed',
];

const RULING_ANSWER: Record<RulingType, string> = {
  wajib: 'It is obligatory (wajib) to observe this ruling; neglect without valid excuse is sinful.',
  mustahab: 'It is recommended (mustahab) and brings spiritual reward without obligation.',
  mubah: 'It is permissible (mubah) with no reward or sin attached in itself.',
  makruh: 'It is disliked (makruh) and should be avoided unless necessity applies.',
  haram: 'It is forbidden (haram) and must be avoided except where the law grants an exception.',
  conditional: 'The ruling depends on conditions; when they are met, the stated hukm applies.',
  informational: 'This is explanatory guidance rather than a single fixed hukm for every case.',
  disputed: 'Scholars differ; a muqallid should follow their marjaʿ or the precautionary view they adopt.',
};

/** Deterministic pseudo-random from string seed (stable across runs). */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[hashSeed(seed) % arr.length];
}

export interface GeneratedQuestion {
  slug: string;
  questionEn: string;
  questionAr: string;
  keywords: string[];
  difficulty: 'basic' | 'general' | 'advanced';
}

export function generateQuestionsForSubcategory(
  categorySlug: string,
  sub: CatalogSubcategory,
  count: number,
): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  const topic = sub.nameEn.toLowerCase();

  for (let i = 0; i < count; i++) {
    const seed = `${categorySlug}/${sub.slug}/${i}`;
    const template = pick(QUESTION_TEMPLATES, seed);
    const scenario = pick(SCENARIOS, `${seed}/scenario`);
    const questionEn = template.replace('{topic}', topic).replace('{scenario}', scenario);
    const slug = `${categorySlug}-${sub.slug}-q${String(i + 1).padStart(4, '0')}`;
    const difficulty =
      i % 11 === 0 ? 'advanced' : i % 4 === 0 ? 'basic' : 'general';

    out.push({
      slug,
      questionEn,
      questionAr: `ما حكم ${sub.nameAr} إذا ${scenario}?`,
      keywords: [sub.slug, categorySlug, ...topic.split(/\s+/).slice(0, 3)],
      difficulty,
    });
  }
  return out;
}

export function rulingForMarjaQuestion(
  marjaSlug: string,
  questionSlug: string,
  subName: string,
): { rulingType: RulingType; answerEn: string; conditionsEn: string | null } {
  const rulingType = pick(RULING_TYPES, `${marjaSlug}/${questionSlug}/ruling`);
  const base = RULING_ANSWER[rulingType];
  const answerEn =
    `${base} Regarding ${subName}, ${marjaSlug.replace(/-/g, ' ')}'s risalah addresses this under practical masail. ` +
    'This seed entry is a structured placeholder — replace with verified text from the marjaʿ\'s published rulings.';
  const conditionsEn =
    rulingType === 'conditional'
      ? 'Apply when the factual scenario matches the conditions described in the question.'
      : null;
  return { rulingType, answerEn, conditionsEn };
}

export function catalogExport() {
  return { maraji: MARAJI, categories: CATEGORIES, principles: LEGAL_PRINCIPLES };
}

export type SeedScale = 'sample' | 'medium' | 'full';

/** Map scale to questions per subcategory (full targets catalog totals). */
export function questionsPerSubcategory(scale: SeedScale, target: number): number {
  if (scale === 'full') return target;
  if (scale === 'medium') return Math.max(8, Math.round(target / 25));
  return Math.min(3, Math.max(2, Math.round(target / 80)));
}

export function estimatedRowCounts(scale: SeedScale): {
  questions: number;
  fatwas: number;
  links: number;
} {
  let questions = 0;
  for (const cat of CATEGORIES) {
    for (const sub of cat.subcategories) {
      questions += questionsPerSubcategory(scale, sub.targetQuestions);
    }
  }
  const fatwas = questions * MARAJI.length;
  const links = scale === 'sample' ? questions : Math.round(questions * 3);
  return { questions, fatwas, links };
}
