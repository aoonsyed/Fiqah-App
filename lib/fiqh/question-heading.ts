/**
 * Risalah imports store a whole numbered ruling ("Ruling 1731. Someone who…")
 * as the question. Rendered as a page title that is a paragraph of bold text,
 * so this splits it into a short label and heading for display.
 */

export interface QuestionHeading {
  /** "Ruling 1731" / "Issue 744" for risalah rulings; null for real questions. */
  label: string | null;
  /** Short title: the question itself, or the ruling's opening clause. */
  heading: string;
  /** True when the stored "question" is actually ruling text. */
  isRulingText: boolean;
}

/** "Ruling 1731." / "Ruling 2435]." / "Issue No. 744-" / "مسأله 1354ـ" */
const RULING_LABEL = /^\s*(?:Ruling\s+(\d+)\]?\.|Issue No\.?\s*(\d+)\s*[-–]|مسأله\s*(\d+)\s*ـ?)\s*/;

const MAX_HEADING_CHARS = 140;

function shorten(text: string): string {
  // A full stop ends the sentence only before a capital/digit/Arabic letter,
  // so "i.e. from" and "e.g. the" don't cut the heading short.
  const firstSentence =
    text.match(/^[\s\S]+?(?:[.؟?!](?=\s+[A-Z0-9؀-ۿ“"(‘]|$)|[:;](?=\s|$))/)?.[0] ?? text;
  const candidate = firstSentence.trim();
  if (candidate.length <= MAX_HEADING_CHARS) return candidate.replace(/[:;]$/, '…');
  const cut = candidate.slice(0, MAX_HEADING_CHARS);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : MAX_HEADING_CHARS).trim()}…`;
}

export function questionHeading(questionEn: string): QuestionHeading {
  const text = questionEn.replace(/\s+/g, ' ').trim();
  const m = text.match(RULING_LABEL);
  if (m) {
    const number = m[1] ?? m[2] ?? m[3];
    const kind = m[1] ? 'Ruling' : 'Issue';
    return { label: `${kind} ${number}`, heading: shorten(text.slice(m[0].length)), isRulingText: true };
  }
  return { label: null, heading: text.length > 220 ? shorten(text) : text, isRulingText: false };
}

/** The ruling text without its leading "Ruling 1731." / "Issue No. 744-" label. */
export function stripRulingLabel(text: string): string {
  return text.replace(RULING_LABEL, '');
}
