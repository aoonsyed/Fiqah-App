import { errorMessage } from '@/lib/errors';
import { fiqhChat } from '@/lib/fiqh/chat-engine';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'anon';
  return request.headers.get('x-real-ip') || 'anon';
}

export async function POST(request: NextRequest) {
  try {
    const key = clientKey(request);
    if (!rateLimit(`fiqh-chat:${key}`, 15, 60)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 },
      );
    }

    const { query, history } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await fiqhChat(
      query.trim(),
      Array.isArray(history)
        ? history.filter(
            (m: unknown) =>
              m &&
              typeof m === 'object' &&
              'role' in m &&
              'content' in m &&
              ((m as { role: string }).role === 'user' || (m as { role: string }).role === 'assistant'),
          )
        : [],
    );

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
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
