/**
 * Where a fatwa's text comes from, in words a reader can check: the marja's
 * book or website, and the ruling number within it.
 *
 * Most of the corpus is generated placeholder text with no published source
 * (`generated_corpus` / `comparative_seed` refs). Those are reported as
 * unverified so the UI and chat never present them as a marja's ruling.
 */

export interface FatwaSource {
  /** True when the text was imported from a published book or official site. */
  verified: boolean;
  /** Book or collection, e.g. "Islamic Laws"; for unverified text, a plain warning. */
  title: string;
  /** Position within the source, e.g. "Ruling 1731" or "Question 2". */
  reference: string | null;
  url: string | null;
  /** Site name for the link label, e.g. "sistani.org". */
  site: string | null;
}

interface EvidenceRef {
  type?: string;
  url?: string;
  number?: string | number;
}

interface KnownSource {
  match: RegExp;
  title: string;
  /** Builds the in-book reference from the stored number and the ruling text. */
  reference?: (number: string, text: string) => string | null;
}

/** "Issue No. 744-" (English) or "مسأله 1354ـ" (Persian) at the start of a risalah ruling. */
function risalahIssue(text: string): string | null {
  const m = text.match(/^\s*(?:Issue No\.?\s*(\d+)|مسأله\s*(\d+))/);
  return m ? `Issue ${m[1] ?? m[2]}` : null;
}

const KNOWN_SOURCES: KnownSource[] = [
  {
    match: /sistani\.org\/english\/book\/48\//,
    title: 'Islamic Laws',
    reference: (n) => (n ? `Ruling ${n}` : null),
  },
  {
    match: /sistani\.org\/urdu\/book\/61\//,
    title: 'Tauzeeh ul Masail (Urdu)',
    reference: (n) => (n ? `Masala ${n}` : null),
  },
  {
    match: /leader\.ir\/en\/book\/32\//,
    title: 'Practical Laws of Islam (Ajwibat al-Istiftāʾāt)',
    reference: (n) => (n ? n.replace(/^Q\s*/i, 'Question ') : null),
  },
  // Makarem's site ids are page ids, not ruling numbers, so only risalah
  // pages get a reference (taken from the ruling text itself).
  { match: /makaremshirazi\.ir\/ahkam\/en\/home\/istifta\//, title: 'Istiftāʾāt (questions answered by his office)' },
  { match: /makaremshirazi\.ir\/ahkam\/fa\/home\/istifta\//, title: 'Istiftāʾāt (Persian, questions answered by his office)' },
  {
    match: /makaremshirazi\.ir\/ahkam\/en\/(?:home\/)?treatise\//,
    title: 'Risalah (book of practical rulings)',
    reference: (_n, text) => risalahIssue(text),
  },
  {
    match: /makaremshirazi\.ir\/ahkam\/fa\/(?:home\/)?treatise\//,
    title: 'Risalah (Persian, book of practical rulings)',
    reference: (_n, text) => risalahIssue(text),
  },
  { match: /al-islam\.org\/islamic-teachings-brief/, title: 'Islamic Teachings in Brief' },
];

const UNVERIFIED: FatwaSource = {
  verified: false,
  title: 'Not from a published source (generated placeholder text)',
  reference: null,
  url: null,
  site: null,
};

function siteName(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function describeFatwaSource(evidenceRefs: unknown[] | null | undefined, answerText = ''): FatwaSource {
  const ref = ((evidenceRefs ?? [])[0] ?? {}) as EvidenceRef;
  if (ref.type !== 'url' || !ref.url) return UNVERIFIED;

  const number = ref.number != null ? String(ref.number) : '';
  const known = KNOWN_SOURCES.find((s) => s.match.test(ref.url!));
  return {
    verified: true,
    title: known?.title ?? siteName(ref.url) ?? 'Published source',
    reference: known ? (known.reference?.(number, answerText) ?? null) : number || null,
    url: ref.url,
    site: siteName(ref.url),
  };
}

/** One-line attribution, e.g. "Islamic Laws · Ruling 1731". */
export function sourceLine(source: FatwaSource): string {
  return source.reference ? `${source.title} · ${source.reference}` : source.title;
}
