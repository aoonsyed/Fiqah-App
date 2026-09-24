import { inferRulingType } from '@/lib/fiqh/ruling-infer';
import { structureRulingDisplay, type StructuredRuling } from '@/lib/fiqh/parse-fatwa-text';
import type { Fatwa, RulingType } from '@/lib/fiqh/types';

export type { StructuredRuling };

export type FatwaCorpusKind = 'imported' | 'comparative_seed' | 'generated_corpus';

export interface FatwaDisplay {
  kind: FatwaCorpusKind;
  /** Primary text the user should read (ruling / explanation). */
  rulingText: string;
  structured: StructuredRuling;
  /** Badge to show in UI — from imported marja text when possible. */
  displayRuling: RulingType;
  /** Value stored in DB (may differ for comparative seeds). */
  storedRuling: RulingType;
  /** When true, do not treat storedRuling as this marja's official hukm. */
  rulingIsPlaceholder: boolean;
  marjaContext: string | null;
  sourceNote: string | null;
  disclaimer: string | null;
}

const PARALLEL_GUIDANCE =
  /Parallel guidance \(Khamenei corpus excerpt for topic alignment\):\s*([\s\S]+?)(?:\n\n|$)/i;

const SEEDED_VIEW = /the seeded view for [^ is]+ is (\w+)\./i;

function corpusKind(evidenceRefs: unknown[]): FatwaCorpusKind {
  const t = (evidenceRefs[0] as { type?: string } | undefined)?.type;
  if (t === 'comparative_seed') return 'comparative_seed';
  if (t === 'generated_corpus') return 'generated_corpus';
  return 'imported';
}

function parseComparativeAnswer(answerEn: string): {
  rulingText: string;
  marjaContext: string | null;
  sourceNote: string | null;
} {
  const parallel = answerEn.match(PARALLEL_GUIDANCE);
  if (parallel?.[1]) {
    const rulingText = parallel[1].replace(/…\s*$/, '…').trim();
    const before = answerEn.slice(0, parallel.index).trim();
    const after = answerEn.slice((parallel.index ?? 0) + parallel[0].length).trim();
    const lines = before.split(/\n\n+/).filter(Boolean);
    const marjaContext = lines.length ? lines.join('\n\n') : null;
    const sourceNote = after || null;
    return { rulingText, marjaContext, sourceNote };
  }

  const parts = answerEn.split(/\n\n+/).filter(Boolean);
  if (parts.length >= 2) {
    const middle = parts.slice(1, -1).join('\n\n');
    return {
      marjaContext: parts[0] ?? null,
      rulingText: middle || parts[1] || answerEn,
      sourceNote: parts[parts.length - 1] ?? null,
    };
  }

  return { rulingText: answerEn, marjaContext: null, sourceNote: null };
}

export function formatFatwaDisplay(fatwa: Fatwa, questionEn?: string | null): FatwaDisplay {
  const kind = corpusKind(fatwa.evidenceRefs ?? []);
  const storedRuling = fatwa.rulingType;

  if (kind === 'imported') {
    const structured = structureRulingDisplay(fatwa.answerEn, {
      questionEn,
      rulingType: storedRuling,
      evidenceRefs: fatwa.evidenceRefs,
      imported: true,
    });
    const rulingText = structured.answerText;
    const displayRuling =
      inferRulingType(rulingText) !== 'informational'
        ? inferRulingType(rulingText)
        : storedRuling;
    return {
      kind,
      rulingText,
      structured,
      displayRuling,
      storedRuling,
      rulingIsPlaceholder: false,
      marjaContext: null,
      sourceNote: fatwa.conditionsEn,
      disclaimer: null,
    };
  }

  if (kind === 'comparative_seed') {
    const { rulingText, marjaContext, sourceNote } = parseComparativeAnswer(fatwa.answerEn);
    const fromText = inferRulingType(rulingText);
    const displayRuling = fromText !== 'informational' ? fromText : storedRuling;
    const seededMatch = fatwa.answerEn.match(SEEDED_VIEW);

    const structured = structureRulingDisplay(rulingText, { questionEn, imported: false });
    return {
      kind,
      rulingText,
      structured,
      displayRuling,
      storedRuling,
      rulingIsPlaceholder: true,
      marjaContext,
      sourceNote: sourceNote ?? seededMatch?.[0] ?? null,
      disclaimer:
        'This marja’s own published answer is not in the corpus yet. The ruling below is taken from aligned official text (Ayatollah Khamenei’s corpus on the same masala). The Wajib/Mustahab tag on some cards is a placeholder until that marja’s text is imported — follow your marjaʿ’s risalah.',
    };
  }

  // generated_corpus
  const rulingText = fatwa.answerEn.trim();
  const structured = structureRulingDisplay(rulingText, { questionEn, imported: false });
  return {
    kind,
    rulingText,
    structured,
    displayRuling: storedRuling,
    storedRuling,
    rulingIsPlaceholder: true,
    marjaContext: null,
    sourceNote: null,
    disclaimer:
      'Structured placeholder entry — replace with verified text from the marjaʿ’s published rulings.',
  };
}

/** Prefer official imported answers for a question-level summary. */
export function pickPrimaryOfficialFatwa(fatwas: Fatwa[]): Fatwa | null {
  const prefer = ['khamenei', 'sistani', 'makarem-shirazi'];
  for (const slug of prefer) {
    const f = fatwas.find(
      (x) => x.marja?.slug === slug && corpusKind(x.evidenceRefs ?? []) === 'imported',
    );
    if (f) return f;
  }
  return fatwas.find((f) => corpusKind(f.evidenceRefs ?? []) === 'imported') ?? null;
}
