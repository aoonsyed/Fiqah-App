/**
 * Minimal Gemini client over the REST API — no SDK dependency.
 * Models are overridable so an alias retiring doesn't need a code change.
 */
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const ANSWER_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
export const RERANK_MODEL = process.env.GEMINI_RERANK_MODEL || 'gemini-flash-lite-latest';

/** Tried in order when a model stays overloaded after its retries. */
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-2.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GenerateOptions {
  model?: string;
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** OpenAPI-subset schema; when set the reply is constrained to JSON. */
  responseSchema?: Record<string, unknown>;
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return key;
}

function buildBody(messages: LLMMessage[], opts: GenerateOptions) {
  return {
    ...(opts.system && { systemInstruction: { parts: [{ text: opts.system }] } }),
    // Gemini calls the assistant role "model".
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      // Generous: thinking models spend part of this budget before answering.
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      temperature: opts.temperature ?? 0.3,
      ...(opts.responseSchema && {
        responseMimeType: 'application/json',
        responseSchema: opts.responseSchema,
      }),
    },
  };
}

function textOf(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  // Thought summaries are flagged and must not leak into the answer.
  return parts
    .filter((p: any) => !p.thought)
    .map((p: any) => p.text ?? '')
    .join('');
}

/** Overload (503) and rate-limit (429) errors from Gemini are routine and short-lived. */
const RETRYABLE = new Set([429, 500, 503]);
// Kept short: an overloaded model usually stays overloaded, and a fallback is next.
const RETRY_DELAYS_MS = [1000, 3000];

async function postOnce(url: string, body: unknown): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
        body: JSON.stringify(body),
      });
    } catch (error) {
      // Dropped connections ("fetch failed") are as transient as a 503.
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      throw error;
    }
    if (res.ok) return res;

    if (RETRYABLE.has(res.status) && attempt < RETRY_DELAYS_MS.length) {
      await res.body?.cancel();
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      continue;
    }
    throw Object.assign(new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`), {
      status: res.status,
    });
  }
}

/** Calls `model`, moving down the fallback list only on overload-type errors. */
async function post(model: string, method: string, body: unknown): Promise<Response> {
  const models = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  for (let i = 0; ; i++) {
    try {
      return await postOnce(`${API_BASE}/${models[i]}:${method}`, body);
    } catch (error: any) {
      if (!RETRYABLE.has(error.status) || i === models.length - 1) throw error;
      console.warn(`Gemini ${models[i]} unavailable (${error.status}); trying ${models[i + 1]}`);
    }
  }
}

export async function generate(messages: LLMMessage[], opts: GenerateOptions = {}): Promise<string> {
  const model = opts.model ?? ANSWER_MODEL;
  const res = await post(model, 'generateContent', buildBody(messages, opts));
  return textOf(await res.json());
}

export async function generateJSON<T>(messages: LLMMessage[], opts: GenerateOptions): Promise<T> {
  return JSON.parse(await generate(messages, opts)) as T;
}

export async function* generateStream(
  messages: LLMMessage[],
  opts: GenerateOptions = {},
): AsyncGenerator<string> {
  const model = opts.model ?? ANSWER_MODEL;
  const res = await post(model, 'streamGenerateContent?alt=sse', buildBody(messages, opts));

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line; keep any partial tail.
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const event of events) {
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('');
      if (!data) continue;
      const text = textOf(JSON.parse(data));
      if (text) yield text;
    }
  }
}
