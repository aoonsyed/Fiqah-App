import { stripRulingLabel } from './question-heading';
import { describeFatwaSource, type FatwaSource } from './source-info';
import type { RulingType } from './types';

export interface StructuredRuling {
  questionText: string | null;
  answerText: string;
  /** First sentence — the direct hukm when possible. */
  hukmSummary: string;
  exceptions: string[];
  /** Published book or site the text was imported from; null for generated text. */
  source: FatwaSource | null;
}

function sentences(text: string): string[] {
  return text
    // Not after a list marker ("as follows: 1. smelling…") — that dot doesn't end a sentence.
    .split(/(?<=[.!?])(?<!(?:^|\s)\d{1,2}\.)\s+/)
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

function verifiedSource(evidenceRefs: unknown[], answer: string): FatwaSource | null {
  const source = describeFatwaSource(evidenceRefs, answer);
  return source.verified ? source : null;
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
  const split = splitQuestionAndAnswer(rawAnswer, options.questionEn);
  const cleanAnswer = split.answerText.replace(/\s+/g, ' ').trim();
  // Risalah rows store the ruling as both question and answer; show it once.
  const questionText =
    split.questionText && split.questionText.replace(/\s+/g, ' ').trim() !== cleanAnswer ? split.questionText : null;
  const exceptions = extractUnlessClauses(cleanAnswer);
  // "Ruling 1731." would otherwise be taken as the first sentence.
  const body = stripRulingLabel(cleanAnswer);
  const firstSentence = sentences(body)[0] ?? body;
  const hukmSummary = firstSentence.length > 20 ? firstSentence : body.slice(0, 280) + (body.length > 280 ? '…' : '');


  return {
    questionText,
    answerText: cleanAnswer,
    hukmSummary,
    exceptions,
    source: verifiedSource(options.evidenceRefs ?? [], cleanAnswer),
  };
}
