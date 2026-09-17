import { embedQuery } from './embedder';
import { similaritySearch } from './db';
import { generate, generateJSON, generateStream, RERANK_MODEL, type LLMMessage } from './llm';
import type { RetrievalResult, SearchFilters } from './types';

export type ChatMessage = LLMMessage;

export interface RAGResponse {
  answer: string;
  sources: RetrievalResult[];
  /** One per source, in order: [[citation:n]] refers to citations[n-1]. */
  citations: Citation[];
}

export interface Citation {
  id: string;
  hadithId: string;
  bookTitle: string;
  chapterTitle: string;
  hadithNumber: string;
  relevanceScore: number;
}

export interface ChatOptions {
  /** Distinct narrations given to the answer. */
  topK?: number;
  /** Distinct narrations the reranker chooses from. */
  candidates?: number;
  threshold?: number;
  filters?: SearchFilters;
}

const DEFAULTS = { topK: 5, candidates: 30, threshold: 0.3 };

/** Enough of a narration to judge relevance without blowing the rerank prompt. */
const RERANK_EXCERPT_CHARS = 700;

/** Older turns add cost but rarely change which sources are relevant. */
const MAX_HISTORY_TURNS = 6;

const SYSTEM_PROMPT = `You are a knowledgeable assistant for a Shia Islamic knowledge base.

**CRITICAL RULES:**
1. ONLY answer from the provided sources. Never use external knowledge.
2. If sources don't contain relevant information, say "I could not find this in the provided sources."
3. Every substantive claim MUST have a citation in the format [[citation:N]], where N is the source number.
4. If sources disagree, present each position separately with its source.
5. Sources come from both Shia and Sunni collections; name the book when that distinction matters.
6. Items marked "fiqh ruling" are a marja's rulings, not narrations. Never call them hadith.
7. For fiqh questions, note you're providing information from sources, not a personal ruling.
8. Reply in the language the user wrote in.`;

/**
 * Two-stage retrieval. Vector similarity alone finds text that looks like the
 * question, which often means five near-identical narrations of one report.
 * A wider pool is retrieved, then the model keeps the ones that actually
 * answer it and cover different ground.
 */
export async function retrieve(query: string, options: ChatOptions = {}): Promise<RetrievalResult[]> {
  const { topK, candidates, threshold } = { ...DEFAULTS, ...options };

  const embedding = await embedQuery(query);
  const pool = await similaritySearch(embedding, Math.max(candidates, topK), threshold, options.filters);

  if (pool.length <= topK) return pool;

  try {
    return await rerank(query, pool, topK);
  } catch (error) {
    // Reranking only improves ordering; similarity order is a usable fallback.
    console.error('Rerank failed, falling back to similarity order:', error);
    return pool.slice(0, topK);
  }
}

async function rerank(query: string, pool: RetrievalResult[], topK: number): Promise<RetrievalResult[]> {
  const listing = pool
    .map((s, i) => {
      const text = (s.matnTranslation || s.chunkText).replace(/\s+/g, ' ').slice(0, RERANK_EXCERPT_CHARS);
      return `[${i}] ${s.bookTitle} #${s.hadithNumber}: ${text}`;
    })
    .join('\n');

  const { selected } = await generateJSON<{ selected: number[] }>(
    [
      {
        role: 'user',
        content: `Question: ${query}

Candidate sources:
${listing}

Choose up to ${topK} candidates that best answer the question, most relevant first.
- Prefer sources that directly address the question over ones that only share keywords.
- Pick sources that each add something different. If several candidates report the same text, keep only the clearest one.
- Leave out candidates that are not relevant, even if that leaves fewer than ${topK}.
Return their bracketed numbers.`,
      },
    ],
    {
      model: RERANK_MODEL,
      temperature: 0,
      responseSchema: {
        type: 'object',
        properties: { selected: { type: 'array', items: { type: 'integer' } } },
        required: ['selected'],
      },
    },
  );

  const seen = new Set<number>();
  const picked = selected
    .filter((i) => Number.isInteger(i) && i >= 0 && i < pool.length && !seen.has(i) && seen.add(i))
    .slice(0, topK)
    .map((i) => pool[i]);

  // An empty pick means nothing was judged relevant; the answer step says so.
  return picked;
}

function formatSources(sources: RetrievalResult[]): string {
  return sources
    .map((s, i) => {
      const kind = s.docType === 'masail' ? 'fiqh ruling' : 'hadith';
      const lines = [
        `[${i + 1}] ${s.bookTitle}${s.chapterTitle ? ` — ${s.chapterTitle}` : ''}, ${kind} ${s.hadithNumber}`,
        s.matnArabic && s.matnArabic !== s.matnTranslation ? `Text: ${s.matnArabic}` : `Text: ${s.chunkText}`,
      ];
      if (s.matnTranslation) lines.push(`Translation: ${s.matnTranslation}`);
      if (s.gradings?.length) {
        lines.push(`Gradings: ${s.gradings.map((g) => `${g.gradedBy ?? 'unattributed'}: ${g.grade}`).join('; ')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

function buildMessages(query: string, history: ChatMessage[], sources: RetrievalResult[]): LLMMessage[] {
  return [
    ...history.slice(-MAX_HISTORY_TURNS),
    {
      role: 'user',
      content: `Here are the relevant sources for the question:

${sources.length ? formatSources(sources) : 'No sources found for this query.'}

---

User question: ${query}

Cite sources as [[citation:1]], [[citation:2]], etc. for each claim.`,
    },
  ];
}

function toCitations(sources: RetrievalResult[]): Citation[] {
  return sources.map((s, i) => ({
    id: `citation:${i + 1}`,
    hadithId: s.hadithId,
    bookTitle: s.bookTitle,
    chapterTitle: s.chapterTitle,
    hadithNumber: s.hadithNumber,
    relevanceScore: s.relevanceScore,
  }));
}

export async function chat(
  query: string,
  conversationHistory: ChatMessage[] = [],
  options: ChatOptions = {},
): Promise<RAGResponse> {
  const sources = await retrieve(query, options);
  const answer = await generate(buildMessages(query, conversationHistory, sources), { system: SYSTEM_PROMPT });

  return { answer, sources, citations: toCitations(sources) };
}

/** Retrieves up front so the caller can send sources before the answer streams. */
export async function streamChat(
  query: string,
  conversationHistory: ChatMessage[] = [],
  options: ChatOptions = {},
): Promise<{ sources: RetrievalResult[]; citations: Citation[]; stream: AsyncGenerator<string> }> {
  const sources = await retrieve(query, options);
  const stream = generateStream(buildMessages(query, conversationHistory, sources), { system: SYSTEM_PROMPT });

  return { sources, citations: toCitations(sources), stream };
}
