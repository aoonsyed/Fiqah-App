import { embedQuery } from '@/lib/rag/embedder';
import { generateJSON, RERANK_MODEL, type LLMMessage } from '@/lib/rag/llm';
import { matchFiqhQuestions, searchFiqh } from './db';
import type { FiqhSearchHit } from './types';

/**
 * Fiqh retrieval in three stages:
 *
 * 1. Understand — the model restates the message as a self-contained English
 *    question (translating Urdu, Roman Urdu, Arabic or Persian, fixing typos,
 *    and resolving follow-ups like "what about Sistani?" against the chat)
 *    and lists the fiqh terms a matching question would contain.
 * 2. Retrieve — multilingual vector search on both the original and restated
 *    query (half the corpus is Persian/Arabic, so this is the only way an
 *    English or Urdu query reaches it) plus keyword search on the terms,
 *    merged by reciprocal rank fusion.
 * 3. Rerank — the model keeps only candidates that address the same issue.
 *    Shared words alone ("bleeding" in a menstruation rule for a question
 *    about bleeding gums) are what made plain search return wrong results.
 *
 * Every model step degrades to the previous stage's output if it fails.
 */

export interface QueryUnderstanding {
  /** Self-contained English question, with follow-ups resolved. */
  searchQuery: string;
  /** Terms a matching question would contain, for keyword search. */
  keywords: string[];
}

export interface SmartSearchOptions {
  history?: LLMMessage[];
  limit?: number;
  filterCategoryId?: string;
  filterMarjaId?: string;
}

export interface SmartSearchResult {
  hits: FiqhSearchHit[];
  understanding: QueryUnderstanding;
}

/** Candidates retrieved per search before fusion. */
const PER_SEARCH = 30;
/** Fused candidates shown to the reranker. */
const RERANK_POOL = 30;
/** Enough of a question to judge its topic without bloating the prompt. */
const RERANK_EXCERPT_CHARS = 350;
/** Earlier turns rarely change what a follow-up refers to. */
const HISTORY_TURNS = 6;
const HISTORY_TURN_CHARS = 500;
/** Lowest rerank grade kept: a closely related ruling. */
const MIN_GRADE = 2;
/** Standard RRF damping constant. */
const RRF_K = 60;

export async function smartSearchFiqh(
  query: string,
  options: SmartSearchOptions = {},
): Promise<SmartSearchResult> {
  const limit = options.limit ?? 20;
  const understanding = await understandQuery(query, options.history ?? []);

  const pool = await retrieveCandidates(query, understanding, options);
  if (pool.length === 0) return { hits: [], understanding };

  try {
    const hits = await rerank(query, understanding, pool, limit);
    return { hits, understanding };
  } catch (error) {
    // Reranking only improves precision; fused order is a usable fallback.
    console.error('Fiqh rerank failed, using fused order:', error);
    return { hits: pool.slice(0, limit), understanding };
  }
}

export async function understandQuery(query: string, history: LLMMessage[]): Promise<QueryUnderstanding> {
  const conversation = history
    .slice(-HISTORY_TURNS)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.replace(/\s+/g, ' ').slice(0, HISTORY_TURN_CHARS)}`)
    .join('\n');

  try {
    const result = await generateJSON<QueryUnderstanding>(
      [
        {
          role: 'user',
          content: `You prepare search queries for a database of Shia fiqh questions answered by maraji. The questions are in English, Persian and Arabic.
${conversation ? `\nConversation so far:\n${conversation}\n` : ''}
Latest user message: ${query}

Return:
- searchQuery: the latest message as one self-contained question in English. Translate it if it is in Urdu, Roman Urdu, Arabic, Persian or any other language, and fix spelling. If it is a follow-up (e.g. "what about Sistani?", "and while travelling?"), fill in the topic from the conversation. Keep the specific subject (e.g. "bleeding gums", "shrimp"); do not generalise it.
- keywords: 3 to 10 words a fiqh question on this exact topic would contain: the key nouns in English, standard fiqh terms and transliterations (e.g. wudu, ablution; sawm, fasting; ghina, music; shrimp, prawn, seafood), and the Persian word for the main subject (e.g. میگو for shrimp, موسیقی for music). Leave out generic words such as ruling, permissible, allowed, islam, halal, haram, question.`,
        },
      ],
      {
        model: RERANK_MODEL,
        temperature: 0,
        responseSchema: {
          type: 'object',
          properties: {
            searchQuery: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
          },
          required: ['searchQuery', 'keywords'],
        },
      },
    );

    const searchQuery = result.searchQuery?.trim() || query;
    const keywords = (result.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 10);
    return { searchQuery, keywords };
  } catch (error) {
    console.error('Fiqh query understanding failed, searching the raw query:', error);
    return { searchQuery: query, keywords: [] };
  }
}

async function retrieveCandidates(
  query: string,
  understanding: QueryUnderstanding,
  options: SmartSearchOptions,
): Promise<FiqhSearchHit[]> {
  const { filterCategoryId, filterMarjaId } = options;
  const semanticQueries = [...new Set([query, understanding.searchQuery])];
  const keywordText = understanding.keywords.length
    ? understanding.keywords.join(' ')
    : understanding.searchQuery;

  const searches: Array<Promise<FiqhSearchHit[]>> = [
    ...semanticQueries.map(async (text) =>
      matchFiqhQuestions(await embedQuery(text), PER_SEARCH, filterCategoryId, filterMarjaId),
    ),
    searchFiqh(keywordText, PER_SEARCH, filterCategoryId, filterMarjaId),
  ];

  // One failing search (e.g. embeddings not backfilled yet) shouldn't sink the rest.
  const settled = await Promise.allSettled(searches);
  const lists = settled.flatMap((s) => {
    if (s.status === 'fulfilled') return [s.value];
    console.error('Fiqh search stage failed:', s.reason);
    return [];
  });
  if (lists.length === 0) throw (settled[0] as PromiseRejectedResult).reason;

  return fuse(lists).slice(0, RERANK_POOL);
}

/** Reciprocal rank fusion: rewards agreement between searches without comparing their raw scores. */
function fuse(lists: FiqhSearchHit[][]): FiqhSearchHit[] {
  const scored = new Map<string, { hit: FiqhSearchHit; score: number }>();
  for (const list of lists) {
    list.forEach((hit, i) => {
      const entry = scored.get(hit.questionId) ?? { hit, score: 0 };
      entry.score += 1 / (RRF_K + i + 1);
      scored.set(hit.questionId, entry);
    });
  }
  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ hit, score }) => ({ ...hit, rank: score }));
}

async function rerank(
  query: string,
  understanding: QueryUnderstanding,
  pool: FiqhSearchHit[],
  limit: number,
): Promise<FiqhSearchHit[]> {
  const listing = pool
    .map((h, i) => `[${i}] ${h.questionEn.replace(/\s+/g, ' ').slice(0, RERANK_EXCERPT_CHARS)}`)
    .join('\n');

  // Grading every candidate is steadier than asking for a pick list, which
  // small models tend to answer all-or-nothing.
  const { grades } = await generateJSON<{ grades: Array<{ index: number; score: number }> }>(
    [
      {
        role: 'user',
        content: `User question: ${understanding.searchQuery}${understanding.searchQuery !== query ? `\n(Original wording: ${query})` : ''}

Candidate fiqh questions (some are in Persian or Arabic — judge them by meaning):
${listing}

Grade every candidate for how useful its ruling is in answering the user's question:
3 = answers it directly
2 = a closely related ruling on the same subject that helps answer it
1 = same broad area of fiqh, but a different issue
0 = unrelated, or only shares a word (e.g. "fast" meaning quick vs. fasting)`,
      },
    ],
    {
      model: RERANK_MODEL,
      temperature: 0,
      responseSchema: {
        type: 'object',
        properties: {
          grades: {
            type: 'array',
            items: {
              type: 'object',
              properties: { index: { type: 'integer' }, score: { type: 'integer' } },
              required: ['index', 'score'],
            },
          },
        },
        required: ['grades'],
      },
    },
  );

  const scores = new Map<number, number>();
  for (const g of grades) {
    if (Number.isInteger(g.index) && g.index >= 0 && g.index < pool.length && !scores.has(g.index)) {
      scores.set(g.index, g.score);
    }
  }

  // Ties keep fused order. Nothing at MIN_GRADE means nothing relevant; callers
  // say so rather than show noise.
  return pool
    .map((hit, i) => ({ hit, score: scores.get(i) ?? 0, i }))
    .filter((c) => c.score >= MIN_GRADE)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map(({ hit, score }) => ({ ...hit, rank: score / 3 }));
}
