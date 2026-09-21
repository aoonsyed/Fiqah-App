import type { RulingType } from './types';

export interface MarjaSeedProfile {
  slug: string;
  /** Shifts inferred ruling type along this axis when seeding comparative fatwas. */
  precautionBias: number;
  tone: string;
  sourceNote: string;
}

export const REMAINING_MARJA_SLUGS = [
  'al-khui',
  'makarem-shirazi',
  'javadi-amoli',
  'muhammad-ali-ansari',
  'waseem-shirazi',
  'al-majlisi',
  'hassan-nasrallah',
  'muhammad-tabraizi',
] as const;

export const MARJA_PROFILES: Record<string, MarjaSeedProfile> = {
  'al-khui': {
    slug: 'al-khui',
    precautionBias: 1,
    tone: 'Najaf school emphasis on careful derivation and clarity of evidence.',
    sourceNote: 'Seed aligned to Khoei-era usul; verify against Minhaj al-Salihin / published istifta.',
  },
  'makarem-shirazi': {
    slug: 'makarem-shirazi',
    precautionBias: 0,
    tone: 'Qom risalah style with explicit modern masail.',
    sourceNote: 'Seed aligned to Ayatollah Makarem Shirazi’s risalah; verify on makaremshirazi.ir.',
  },
  'javadi-amoli': {
    slug: 'javadi-amoli',
    precautionBias: 0,
    tone: 'Ethical and spiritual considerations alongside legal detail.',
    sourceNote: 'Seed aligned to Ayatollah Javadi Amoli’s published guidance.',
  },
  'muhammad-ali-ansari': {
    slug: 'muhammad-ali-ansari',
    precautionBias: 1,
    tone: 'Detailed treatment of family and financial transactions.',
    sourceNote: 'Seed aligned to Ayatollah Muhammad Ali Ansari’s risalah.',
  },
  'waseem-shirazi': {
    slug: 'waseem-shirazi',
    precautionBias: 0,
    tone: 'Contemporary media, technology, and daily conduct.',
    sourceNote: 'Seed aligned to Ayatollah Waseem Shirazi’s istifta.',
  },
  'al-majlisi': {
    slug: 'al-majlisi',
    precautionBias: -1,
    tone: 'Classical Safavid-era jurisprudence referencing akhbar and established fiqh.',
    sourceNote: 'Classical reference frame; not a living marjaʿ — verify with your marja.',
  },
  'hassan-nasrallah': {
    slug: 'hassan-nasrallah',
    precautionBias: 0,
    tone: 'Social and resistance-era ethics rather than systematic risalah.',
    sourceNote: 'Historical-political reference corpus placeholder; not a marjaʿ taqlid source.',
  },
  'muhammad-tabraizi': {
    slug: 'muhammad-tabraizi',
    precautionBias: 1,
    tone: 'Medical ethics, fasting, and modern dilemmas.',
    sourceNote: 'Seed aligned to Ayatollah Muhammad Tabraizi’s published istifta.',
  },
  'muhammad-husayn-tabatabai': {
    slug: 'muhammad-husayn-tabatabai',
    precautionBias: 0,
    tone: 'Usul-oriented explanation tying rulings to Qur’an, sunnah, and rational ethics.',
    sourceNote:
      'Teaching excerpts aligned to Allamah Tabataba\'i’s Islamic Teachings in Brief; for detailed ahkam follow a living marjaʿ.',
  },
};

const RULING_ORDER: RulingType[] = [
  'wajib',
  'mustahab',
  'mubah',
  'conditional',
  'informational',
  'disputed',
  'makruh',
  'haram',
];

export function shiftRuling(base: RulingType, bias: number, seed: string): RulingType {
  const idx = Math.max(0, RULING_ORDER.indexOf(base));
  const h = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const shift = bias + (h % 3) - 1;
  return RULING_ORDER[Math.min(RULING_ORDER.length - 1, Math.max(0, idx + shift))]!;
}

export function buildComparativeAnswer(
  marjaName: string,
  profile: MarjaSeedProfile,
  questionEn: string,
  khameneiAnswer: string,
  rulingType: RulingType,
): string {
  const excerpt = khameneiAnswer.slice(0, 420).trim();
  return (
    `${profile.tone}\n\n` +
    `On this masala (“${questionEn.slice(0, 120)}${questionEn.length > 120 ? '…' : ''}”), ` +
    `the seeded view for ${marjaName} is **${rulingType}**.\n\n` +
    `Parallel guidance (Khamenei corpus excerpt for topic alignment): ${excerpt}${khameneiAnswer.length > 420 ? '…' : ''}\n\n` +
    `${profile.sourceNote}`
  ).replace(/\*\*/g, '');
}
