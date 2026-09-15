import { encodingForModel } from 'js-tiktoken';
import type { ChunkerConfig } from './types';

const tokenizer = encodingForModel('gpt-4');

const DEFAULT_CONFIG: Required<ChunkerConfig> = {
  minChunkLength: 150,
  maxChunkLength: 800,
  overlapTokens: 50,
  sentenceBoundary: true,
};

export function chunkText(text: string, config: ChunkerConfig = {}): string[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (finalConfig.sentenceBoundary) {
    return chunkBySentence(text, finalConfig);
  }

  return chunkByTokens(text, finalConfig);
}

function chunkBySentence(text: string, config: Required<ChunkerConfig>): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[۔؛:،])\s+/g)
    .filter((s) => s.trim().length > 0);

  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  // Each sentence is tokenised exactly once and the running total is carried
  // forward. Re-encoding the whole accumulated chunk per sentence instead makes
  // this quadratic — it cost ~74s on a single book.
  for (const sentence of sentences) {
    const tokens = tokenizer.encode(sentence).length;

    if (currentTokens + tokens > config.maxChunkLength && current.length > 0) {
      chunks.push(current.join(' '));
      current = [];
      currentTokens = 0;
    }

    current.push(sentence);
    currentTokens += tokens;
  }

  // Always keep the tail: dropping it when it's short silently loses the end of
  // the text, and for a short input it's the only chunk there is.
  if (current.length > 0) chunks.push(current.join(' '));

  return chunks.filter((c) => c.trim().length > 0);
}

function chunkByTokens(text: string, config: Required<ChunkerConfig>): string[] {
  const tokens = tokenizer.encode(text);
  const chunks: string[] = [];

  // Overlap must leave forward progress, or `start` never advances.
  const stride = Math.max(config.maxChunkLength - config.overlapTokens, 1);

  for (let start = 0; start < tokens.length; start += stride) {
    const end = Math.min(start + config.maxChunkLength, tokens.length);
    const chunk = tokenizer.decode(tokens.slice(start, end));

    if (chunk.trim().length > 0) chunks.push(chunk);
    if (end === tokens.length) break;
  }

  return chunks;
}

export function estimateTokenCount(text: string): number {
  return tokenizer.encode(text).length;
}
