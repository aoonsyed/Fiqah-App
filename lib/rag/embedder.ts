import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

/**
 * Local embeddings via Transformers.js — no API key, no per-token cost.
 * multilingual-e5-small handles Urdu, Arabic and English in one shared space,
 * so an English question can retrieve an Arabic narration.
 */
const MODEL = 'Xenova/multilingual-e5-small';

/** Must match vector(384) in schema.sql. */
export const EMBEDDING_DIMENSIONS = 384;

/** Keeps peak memory sane while still batching enough to be fast. */
const BATCH_SIZE = 32;

// Weights are downloaded once on first use and cached on disk thereafter.
env.cacheDir = process.env.TRANSFORMERS_CACHE || './.cache/models';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

/** Loads the model once per process; concurrent callers share the same load. */
function getExtractor(): Promise<FeatureExtractionPipeline> {
  extractorPromise ??= pipeline('feature-extraction', MODEL);
  return extractorPromise;
}

/**
 * e5 models are trained with asymmetric prefixes: stored text is a "passage",
 * the thing being searched for is a "query". Mixing them up measurably degrades
 * retrieval, so the two directions are separate functions rather than a flag.
 */
async function embed(texts: string[], prefix: 'query' | 'passage'): Promise<number[][]> {
  if (texts.length === 0) return [];

  const extractor = await getExtractor();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => `${prefix}: ${t}`);
    const output = await extractor(batch, { pooling: 'mean', normalize: true });
    vectors.push(...(output.tolist() as number[][]));
  }

  return vectors;
}

export function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, 'passage');
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embed([text], 'query'))[0];
}

/** Downloads and warms the model so the first real request isn't slow. */
export async function warmUpEmbedder(): Promise<void> {
  await getExtractor();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
