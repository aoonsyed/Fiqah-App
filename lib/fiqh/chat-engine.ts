import { generate, type LLMMessage } from '@/lib/rag/llm';
import { compareQuestion, getQuestionBySlug, searchFiqhRobust } from './db';
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
5. If excerpts do not cover the question, say so and suggest browsing related topics.`;

export async function fiqhChat(
  query: string,
  history: LLMMessage[] = [],
): Promise<FiqhChatResponse> {
  const hits = await searchFiqhRobust(query, 8);
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

  let pool: Array<{ f: Fatwa; hit: FiqhSearchHit; detail: CompareSummary }> = [];
  if (primaryCompare?.fatwas.length) {
    pool = primaryCompare.fatwas.map((f) => ({
      f,
      hit: hits[0]!,
      detail: primaryCompare,
    }));
  } else {
    const details = await Promise.all(hits.slice(0, 3).map((h) => compareQuestion(h.questionSlug)));
    pool = details.flatMap((d, hi) =>
      d ? d.fatwas.map((f) => ({ f, hit: hits[hi]!, detail: d })) : [],
    );
  }

  for (const { f, hit, detail } of pool) {
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
    });
    if (n >= 16) break;
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
        `[${i + 1}] ${c.marjaName} (${c.rulingType}) — ${c.categorySlug}/${c.subcategorySlug}\n` +
        `Question: ${c.questionEn}\nAnswer excerpt: ${c.excerpt}`,
    )
    .join('\n\n');

  const messages: LLMMessage[] = [
    ...history.slice(-6),
    {
      role: 'user',
      content: `User question: ${query}\n\nFatwa excerpts:\n${context}\n\nAnswer with [[citation:N]] markers.`,
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
