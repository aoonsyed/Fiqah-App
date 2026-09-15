import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { chat, streamChat } from '@/lib/rag/engine';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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

    const { query, conversationId, history, stream } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Streaming response
    if (stream) {
      return streamResponse(query, history || []);
    }

    // Regular response
    const response = await chat(query, history || []);

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

async function streamResponse(query: string, history: any[]) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(query, history)) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
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
