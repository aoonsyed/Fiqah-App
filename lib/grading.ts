/**
 * Plain-language reading of hadith gradings. Sources grade in Arabic (صحيح,
 * ضعيف أو مجهول, مرسل…) or transliterated English (Sahih, Isnaad Hasan, weak),
 * so a verdict is classified by keyword into a small set of tones for display.
 * The original wording is always shown alongside — this never replaces it.
 */

export type GradeTone = 'authentic' | 'acceptable' | 'weak' | 'unknown';

export interface GradeReading {
  tone: GradeTone;
  /** Short English meaning, e.g. "Authentic", "Weak or unknown narrator". */
  meaning: string;
}

interface Rule {
  test: RegExp;
  tone: GradeTone;
  meaning: string;
}

// Order matters: the first match wins, so compound and weakening terms come
// before the plain "sahih" they may contain ("Sahih li-ghayrihi", "isnad da'if").
const RULES: Rule[] = [
  // Not a verdict on the chain at all.
  { test: /لم يخرجه|لم يذكر الطريق|^-$/, tone: 'unknown', meaning: 'Not assessed' },
  { test: /سكت عنه/, tone: 'unknown', meaning: 'No verdict given' },
  { test: /مختلف|متلف فيه/, tone: 'unknown', meaning: 'Disputed among scholars' },
  { test: /يحتاط|للاحتياط|فيه (تردد|اشكال|بحث|نظر|وجهان)/, tone: 'unknown', meaning: 'Uncertain — act with caution' },

  { test: /موضوع|mawdu|fabricat/i, tone: 'weak', meaning: 'Fabricated' },
  { test: /باطل|batil/i, tone: 'weak', meaning: 'Void (batil)' },
  { test: /منكر|munkar|rejected/i, tone: 'weak', meaning: 'Rejected (munkar)' },
  { test: /ساقط/, tone: 'weak', meaning: 'Discarded' },
  { test: /very da['ʿ]?[ie]e?f/i, tone: 'weak', meaning: 'Very weak' },
  { test: /ضعيف أو مجهول/, tone: 'weak', meaning: 'Weak or has an unknown narrator' },
  { test: /ضعيف|ضعف|da['ʿ]?[ie]e?f|weak/i, tone: 'weak', meaning: 'Weak' },
  { test: /مجهول|مهول|majhul|^unknown$/i, tone: 'weak', meaning: 'Unknown narrator in the chain' },
  { test: /مرسل|مسل|mursal|loosely transmitted/i, tone: 'weak', meaning: 'Broken chain (mursal)' },
  { test: /shadh|شاذ/i, tone: 'weak', meaning: 'Anomalous (shadh)' },

  // Say who the words are attributed to, not whether the chain is sound.
  { test: /^(مرفوع|raised)$/i, tone: 'unknown', meaning: 'Attributed to the Prophet (marfuʿ)' },
  { test: /^(maqtu|mauquf|mawquf)$/i, tone: 'unknown', meaning: 'Words of a Companion or later figure' },

  // "Hasan Sahih" is al-Tirmidhi's strongest grade, so it must precede plain hasan.
  { test: /hasan sa?h[iī]h/i, tone: 'authentic', meaning: 'Authentic (hasan sahih)' },
  // al-Majlisi's "hasan, like sahih": a good chain he treats as authentic.
  { test: /حسن كالصحيح/, tone: 'acceptable', meaning: 'Good, treated as authentic' },
  { test: /موثق|كالموثق|muwath+aq|^reliable$/i, tone: 'acceptable', meaning: 'Reliable (muwaththaq)' },
  { test: /حسن|hasan|^good$/i, tone: 'acceptable', meaning: 'Good (hasan)' },
  { test: /لا يبعد الاعتماد/, tone: 'acceptable', meaning: 'Can likely be relied on' },
  { test: /معتبر|muʿ?tabar|mu'tabar/i, tone: 'authentic', meaning: 'Reliable (muʿtabar)' },
  { test: /صحيح|الصحة|sa?h[iī]h|authentic/i, tone: 'authentic', meaning: 'Authentic (sahih)' },
];

export function readGrade(grade: string): GradeReading {
  const rule = RULES.find((r) => r.test.test(grade));
  return rule ? { tone: rule.tone, meaning: rule.meaning } : { tone: 'unknown', meaning: 'See original wording' };
}

/** One tone for a narration graded by several scholars who may disagree. */
export function summarizeGrades(grades: Array<{ grade: string }> | undefined): GradeTone | 'mixed' | null {
  if (!grades?.length) return null;
  const tones = new Set(grades.map((g) => readGrade(g.grade).tone));
  tones.delete('unknown');
  if (tones.size === 0) return 'unknown';
  if (tones.size === 1) return [...tones][0];
  // Authentic + acceptable is agreement that it can be relied on, not a dispute.
  if (!tones.has('weak')) return 'acceptable';
  return 'mixed';
}

export const TONE_LABEL: Record<GradeTone | 'mixed', string> = {
  authentic: 'Authentic',
  acceptable: 'Acceptable',
  weak: 'Weak',
  unknown: 'Graded',
  mixed: 'Scholars differ',
};

/**
 * Why a narration has no grading, which matters: "not graded" is not "weak".
 * Bukhari and Muslim are left ungraded because the collections as a whole are
 * accepted as authentic in Sunni scholarship.
 */
export function ungradedNote(bookTitle: string, docType?: string): string {
  if (docType === 'masail') {
    return 'This is a fiqh ruling from a marjaʿ, not a narration, so it has no chain grading.';
  }
  if (/bukh[aā]r[iī]|ṣaḥīḥ muslim|sahih muslim/i.test(bookTitle)) {
    return 'Not graded individually. In Sunni scholarship the entire collection is accepted as authentic (sahih), so its source does not grade each hadith. Shia scholars assess these chains separately.';
  }
  if (/nahj al-bal/i.test(bookTitle)) {
    return 'Not graded. Nahj al-Balagha is a compilation of sermons and sayings by al-Sharif al-Radi, recorded mostly without chains, so narrations are not graded individually.';
  }
  return 'No grading is recorded for this narration in our source. That means it has not been assessed here — not that it is weak. Check the chain and consult a scholar before relying on it.';
}
