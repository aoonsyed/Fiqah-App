import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { chat, streamChat, type ChatOptions } from '@/lib/rag/engine';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const DOC_TYPES = ['hadith', 'masail'] as const;

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: 10 requests per minute per IP
    if (!rateLimit(clientIp, 10, 60)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 },
      );
    }

    const { query, conversationId, history, stream, topK, docType, bookIds } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    if (docType !== undefined && !DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: `docType must be one of: ${DOC_TYPES.join(', ')}` }, { status: 400 });
    }

    const options: ChatOptions = {
      // Capped so a client can't blow up the prompt size.
      topK: Number.isInteger(topK) ? Math.min(Math.max(topK, 1), 10) : undefined,
      filters: {
        docType,
        bookIds: Array.isArray(bookIds) ? bookIds.filter((id) => typeof id === 'string') : undefined,
      },
    };

    // Streaming response
    if (stream) {
      return streamResponse(query, history || [], options);
    }

    // Regular response
    const response = await chat(query, history || [], options);

    return NextResponse.json({
      answer: response.answer,
      sources: response.sources,
      citations: response.citations,
      conversationId: conversationId || crypto.randomUUID(),
    });
  } catch (error) {
    console.error('Chat error:', error);

    return NextResponse.json(
      {
        error: 'Chat request failed',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Server-sent events: one `sources` event first (so citations render as the
 * text arrives), then `token` events, then `done`.
 */
async function streamResponse(query: string, history: any[], options: ChatOptions) {
  const { sources, citations, stream } = await streamChat(query, history, options);
  const encoder = new TextEncoder();
  const send = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const body = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(send('sources', { sources, citations }));
        for await (const chunk of stream) {
          controller.enqueue(send('token', chunk));
        }
        controller.enqueue(send('done', {}));
        controller.close();
      } catch (error) {
        controller.enqueue(send('error', { message: errorMessage(error) }));
        controller.close();
      }
    },
  });

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET() {
  return NextResponse.json({ message: 'Chat API endpoint' });
}
