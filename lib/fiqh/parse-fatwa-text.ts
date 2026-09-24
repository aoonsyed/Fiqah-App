import type { RulingType } from './types';

export interface EvidenceRef {
  type?: string;
  url?: string;
  number?: string | number;
}

export interface StructuredRuling {
  questionText: string | null;
  answerText: string;
  /** First sentence — the direct hukm when possible. */
  hukmSummary: string;
  exceptions: string[];
  keyPoints: string[];
  source: { url: string; number: string; title: string } | null;
  /** Imported text that is complete but concise (typical of istifta books). */
  isBriefOfficial: boolean;
}

const SOURCE_TITLES: Record<string, string> = {
  'leader.ir': 'Practical Laws of Islam — Ajwibat al-Istiftāʾāt (English)',
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

/** Split combined "Q: …? Answer…" blobs from EPUB import. */
export function splitQuestionAndAnswer(raw: string, fallbackQuestion?: string | null): {
  questionText: string | null;
  answerText: string;
} {
  let text = raw.trim();
  if (/^Q:\s*/i.test(text)) text = text.replace(/^Q:\s*/i, '').trim();

  const qEnd = text.indexOf('?');
  if (qEnd > 24 && qEnd < text.length - 24) {
    const q = text.slice(0, qEnd + 1).trim();
    const a = text.slice(qEnd + 1).trim();
    if (a.length >= 12) return { questionText: q, answerText: a };
  }

  if (fallbackQuestion?.trim()) {
    const fq = fallbackQuestion.trim();
    if (text.toLowerCase().startsWith(fq.toLowerCase().slice(0, 40))) {
      const rest = text.slice(fq.length).replace(/^\s*[?.:]\s*/, '').trim();
      if (rest.length >= 12) return { questionText: fq, answerText: rest };
    }
    if (text.length >= 12 && text !== fq) {
      return { questionText: fq, answerText: text };
    }
  }

  return { questionText: fallbackQuestion ?? null, answerText: text };
}

function extractUnlessClauses(answer: string): string[] {
  const out: string[] = [];
  const unlessRe = /\bunless\b[^.?!]+[.?!]?/gi;
  let m: RegExpExecArray | null;
  while ((m = unlessRe.exec(answer))) {
    const clause = m[0].trim().replace(/\s+/g, ' ');
    if (clause.length > 10) out.push(clause.charAt(0).toUpperCase() + clause.slice(1));
  }
  return out;
}

function keyPointsFromAnswer(answer: string, exceptions: string[]): string[] {
  const pts = sentences(answer).filter((s) => !/^unless\b/i.test(s));
  if (pts.length <= 1) return pts;
  return pts;
}

function parseSource(evidenceRefs: unknown[]): StructuredRuling['source'] {
  const ref = (evidenceRefs[0] ?? {}) as EvidenceRef;
  if (ref.type === 'url' && ref.url) {
    const num = ref.number != null ? String(ref.number) : '';
    let title = 'Official published source';
    for (const [host, label] of Object.entries(SOURCE_TITLES)) {
      if (ref.url.includes(host)) title = label;
    }
    return { url: ref.url, number: num, title };
  }
  return null;
}

export function structureRulingDisplay(
  rawAnswer: string,
  options: {
    questionEn?: string | null;
    rulingType?: RulingType;
    evidenceRefs?: unknown[];
    imported?: boolean;
  } = {},
): StructuredRuling {
  const { questionText, answerText } = splitQuestionAndAnswer(rawAnswer, options.questionEn);
  const cleanAnswer = answerText.replace(/\s+/g, ' ').trim();
  const exceptions = extractUnlessClauses(cleanAnswer);
  const keyPoints = keyPointsFromAnswer(cleanAnswer, exceptions);
  const firstSentence = sentences(cleanAnswer)[0] ?? cleanAnswer;
  const hukmSummary =
    firstSentence.length > 20 ? firstSentence : cleanAnswer.slice(0, 280) + (cleanAnswer.length > 280 ? '…' : '');

  const isBriefOfficial = Boolean(options.imported && cleanAnswer.length < 520);

  return {
    questionText,
    answerText: cleanAnswer,
    hukmSummary,
    exceptions,
    keyPoints,
    source: parseSource(options.evidenceRefs ?? []),
    isBriefOfficial,
  };
}
