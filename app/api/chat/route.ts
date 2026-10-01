import { publicErrorMessage } from '@/lib/errors';
import { fiqhChat } from '@/lib/fiqh/chat-engine';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * Every character here is sent to the paid LLM, so sizes are capped. The engine
 * only uses the last 6 history turns; anything beyond that is dropped.
 */
const MAX_QUERY_CHARS = 2_000;
const MAX_TURN_CHARS = 8_000;
const MAX_HISTORY_TURNS = 6;

const ChatBody = z.object({
  query: z.string().trim().min(1, 'Query is required').max(MAX_QUERY_CHARS, `Query must be under ${MAX_QUERY_CHARS} characters`),
  history: z
    .array(z.unknown())
    .optional()
    .transform((items) =>
      (items ?? [])
        .filter(
          (m): m is { role: 'user' | 'assistant'; content: string } =>
            !!m &&
            typeof m === 'object' &&
            ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
            typeof (m as { content?: unknown }).content === 'string',
        )
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TURN_CHARS) })),
    ),
});

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`fiqh-chat:${getClientIp(request)}`, 15, 60)) {
      return tooManyRequests();
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }
    const parsed = ChatBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    const { query, history } = parsed.data;

    const response = await fiqhChat(query, history);

    return NextResponse.json({
      answer: response.answer,
      sources: response.sources,
      citations: response.citations,
      primaryCompare: response.primaryCompare ?? null,
      relatedQuestions: response.relatedQuestions ?? [],
      conversationId: crypto.randomUUID(),
    });
  } catch (error) {
    console.error('Fiqh chat error:', error);

    return NextResponse.json(
      {
        error: 'Chat request failed',
        message: publicErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
