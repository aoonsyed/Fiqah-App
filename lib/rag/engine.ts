import Anthropic from '@anthropic-ai/sdk';
import { embedQuery } from './embedder';
import { similaritySearch } from './db';
import type { RetrievalResult } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-3-5-sonnet-20241022';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RAGResponse {
  answer: string;
  sources: RetrievalResult[];
  citations: Citation[];
}

export interface Citation {
  id: string;
  bookTitle: string;
  chapterTitle: string;
  hadithNumber: string;
  relevanceScore: number;
}

const SYSTEM_PROMPT = `You are a knowledgeable assistant for a Shia Islamic knowledge base.

**CRITICAL RULES:**
1. ONLY answer from the provided sources. Never use external knowledge.
2. If sources don't contain relevant information, say "I could not find this in the provided sources."
3. Every substantive claim MUST have a citation in the format [[citation:ID]]
4. If sources disagree, present each position separately with its source.
5. For fiqh questions, note you're providing information from sources, not a personal ruling.
6. Format citations as: [[citation:1]], [[citation:2]], etc.

You are answering questions about Islamic knowledge, particularly Shia hadith and jurisprudence.`;

export async function chat(
  query: string,
  conversationHistory: ChatMessage[] = [],
  options: { topK?: number; threshold?: number } = {},
): Promise<RAGResponse> {
  const topK = options.topK || 10;
  const threshold = options.threshold || 0.3;

  // Embed the query
  const queryEmbedding = await embedQuery(query);

  // Retrieve relevant hadiths
  const sources = await similaritySearch(queryEmbedding, topK, threshold);

  // Build context from sources
  const sourceContext = sources
    .map(
      (source, idx) =>
        `[${idx + 1}] From ${source.bookTitle} (${source.chapterTitle}), Hadith ${source.hadithNumber}:
${source.chunkText}
${source.matnTranslation ? `\nTranslation: ${source.matnTranslation}` : ''}
${source.gradings?.length ? `\nGradings: ${source.gradings.map((g) => `${g.gradedBy ?? 'unattributed'}: ${g.grade}`).join('; ')}` : ''}`,
    )
    .join('\n\n');

  // Build messages for Claude
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: `Here are relevant sources for your question:

${sourceContext || 'No sources found for this query.'}

---

User question: ${query}

Remember to cite sources as [[citation:1]], [[citation:2]], etc. for each claim.`,
    },
  ];

  // Call Claude
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  const answer = response.content[0]?.type === 'text' ? response.content[0].text : '';

  // Extract citations from answer
  const citations = extractCitations(answer, sources);

  return {
    answer,
    sources,
    citations,
  };
}

/**
 * Extract citation references from the answer
 */
function extractCitations(answer: string, sources: RetrievalResult[]): Citation[] {
  const citations: Citation[] = [];
  const citationMatches = answer.matchAll(/\[\[citation:(\d+)\]\]/g);

  for (const match of citationMatches) {
    const sourceIdx = parseInt(match[1]) - 1;

    if (sourceIdx >= 0 && sourceIdx < sources.length) {
      const source = sources[sourceIdx];

      citations.push({
        id: `citation:${sourceIdx + 1}`,
        bookTitle: source.bookTitle,
        chapterTitle: source.chapterTitle,
        hadithNumber: source.hadithNumber,
        relevanceScore: source.relevanceScore,
      });
    }
  }

  return citations;
}

/**
 * Stream chat response (for real-time UI updates)
 */
export async function* streamChat(
  query: string,
  conversationHistory: ChatMessage[] = [],
): AsyncGenerator<string> {
  const topK = 10;
  const threshold = 0.3;

  // Embed the query
  const queryEmbedding = await embedQuery(query);

  // Retrieve relevant hadiths
  const sources = await similaritySearch(queryEmbedding, topK, threshold);

  // Build context from sources
  const sourceContext = sources
    .map(
      (source, idx) =>
        `[${idx + 1}] From ${source.bookTitle} (${source.chapterTitle}), Hadith ${source.hadithNumber}:
${source.chunkText}`,
    )
    .join('\n\n');

  // Build messages for Claude
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: `Here are relevant sources:

${sourceContext || 'No sources found.'}

---

Question: ${query}

Cite as [[citation:1]], [[citation:2]], etc.`,
    },
  ];

  // Stream response
  const stream = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
