import { generate, type LLMMessage } from '@/lib/rag/llm';
import { compareQuestion, getQuestionBySlug } from './db';
import { looksLikePageChrome, smartSearchFiqh } from './retrieval';
import { describeFatwaSource, sourceLine } from './source-info';
import type { CompareSummary, Fatwa, FiqhSearchHit, RulingType } from './types';

export interface FiqhCitation {
  id: string;
  questionSlug: string;
  questionEn: string;
  marjaName: string;
  categorySlug: string;
  subcategorySlug: string;
  rulingType: RulingType;
  excerpt: string;
  /** "Islamic Laws · Ruling 1731", or a warning for generated text. */
  source: string;
  sourceUrl: string | null;
  /** False for generated placeholder text that no marja published. */
  verified: boolean;
}

export interface FiqhChatResponse {
  answer: string;
  citations: FiqhCitation[];
  sources: FiqhCitation[];
  /** Best-matching masala with all loaded marja fatwas for UI compare grid. */
  primaryCompare?: CompareSummary | null;
  relatedQuestions?: Array<{ slug: string; questionEn: string; marjaCount: number }>;
}

const SYSTEM = `You are a Shia fiqh research assistant. Answer ONLY from the fatwa excerpts provided.
Rules:
1. Compare maraji when the excerpts differ; note agreement when they align.
2. Use [[citation:N]] markers matching the numbered excerpts (1-based).
3. This is informational, not a personal religious ruling — tell the user to follow their marja.
4. Do not cite hadith collections or narrations unless an excerpt explicitly mentions them.
5. If excerpts do not cover the question, say so and suggest browsing related topics.
6. Reply in the language the user wrote in. Some excerpts are in Persian or Arabic; translate what you use.
7. Each excerpt names its source. When you state a ruling, say whose it is and which book it is from (e.g. "Ayatollah Sistani, Islamic Laws, Ruling 1731").
8. An excerpt marked UNVERIFIED is generated placeholder text, not a published ruling. Never present it as a marja's view; if you mention it, say it is unverified.`;

/** Fatwas per supporting question, after the best match's full set. */
const SUPPORTING_FATWAS = 3;
const MAX_CITATIONS = 16;

function isPublished(f: Fatwa): boolean {
  return describeFatwaSource(f.evidenceRefs).verified;
}

function publishedFirst(fatwas: Fatwa[]): Fatwa[] {
  return [...fatwas].sort((a, b) => Number(isPublished(b)) - Number(isPublished(a)));
}

export async function fiqhChat(
  query: string,
  history: LLMMessage[] = [],
): Promise<FiqhChatResponse> {
  const { hits, understanding } = await smartSearchFiqh(query, { history, limit: 6 });
  if (hits.length === 0) {
    return {
      answer:
        'I could not find matching questions in the fiqh corpus yet. Try a shorter phrase (e.g. “khums salary”, “music at home”) or browse topics from the home page.',
      citations: [],
      sources: [],
      primaryCompare: null,
      relatedQuestions: [],
    };
  }

  const primaryCompare = await compareQuestion(hits[0]!.questionSlug);
  const relatedQuestions = hits.slice(1, 5).map((h) => ({
    slug: h.questionSlug,
    questionEn: h.questionEn,
    marjaCount: h.marjaCount,
  }));

  const citations: FiqhCitation[] = [];
  let n = 0;

  // The best match's full marja comparison first, then a few fatwas from the
  // next matches so a narrow top hit doesn't leave the answer uncovered.
  const supporting = await Promise.all(hits.slice(1, 3).map((h) => compareQuestion(h.questionSlug)));
  const allCandidates: Array<{ f: Fatwa; hit: FiqhSearchHit; detail: CompareSummary }> = [
    ...(primaryCompare ? publishedFirst(primaryCompare.fatwas) : []).map((f) => ({
      f,
      hit: hits[0]!,
      detail: primaryCompare!,
    })),
    ...supporting.flatMap((d, i) =>
      d ? publishedFirst(d.fatwas).slice(0, SUPPORTING_FATWAS).map((f) => ({ f, hit: hits[i + 1]!, detail: d })) : [],
    ),
  ].filter(({ f }) => !looksLikePageChrome(f.answerEn));
  // Generated placeholder text only reaches the model when nothing published matched.
  const published = allCandidates.filter(({ f }) => isPublished(f));
  const pool = published.length > 0 ? published : allCandidates;

  for (const { f, hit, detail } of pool) {
    const source = describeFatwaSource(f.evidenceRefs, f.answerEn);
    n += 1;
    citations.push({
      id: String(n),
      questionSlug: hit.questionSlug,
      questionEn: detail.question.questionEn,
      marjaName: f.marja?.nameEn ?? 'Marja',
      categorySlug: hit.categorySlug,
      subcategorySlug: hit.subcategorySlug,
      rulingType: f.rulingType,
      excerpt: f.answerEn.slice(0, 600),
      source: sourceLine(source),
      sourceUrl: source.url,
      verified: source.verified,
    });
    if (n >= MAX_CITATIONS) break;
  }

  if (citations.length === 0) {
    const q = await getQuestionBySlug(hits[0].questionSlug);
    return {
      answer: q
        ? `I found a related question (“${q.questionEn}”) but no marja answers are loaded yet.`
        : 'No fatwa text is available for the closest matches.',
      citations: [],
      sources: [],
      primaryCompare: primaryCompare ?? null,
      relatedQuestions,
    };
  }

  const context = citations
    .map(
      (c, i) =>
        `[${i + 1}] ${c.marjaName} — ${
          c.verified ? `Source: ${c.source}` : 'UNVERIFIED: generated placeholder text, not a published ruling'
        } (${c.rulingType})\n` +
        `Question: ${c.questionEn}\nAnswer excerpt: ${c.excerpt}`,
    )
    .join('\n\n');

  const messages: LLMMessage[] = [
    ...history.slice(-6),
    {
      role: 'user',
      content:
        `User question: ${query}\n` +
        (understanding.searchQuery !== query ? `(Understood as: ${understanding.searchQuery})\n` : '') +
        `\nFatwa excerpts:\n${context}\n\nAnswer with [[citation:N]] markers.`,
    },
  ];

  const answer = await generate(messages, { system: SYSTEM, temperature: 0.25 });

  return {
    answer,
    citations,
    sources: citations,
    primaryCompare: primaryCompare ?? null,
    relatedQuestions,
  };
}
