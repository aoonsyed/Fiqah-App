/**
 * Fills fiqh_questions.embedding for semantic search (migration 005).
 * Resumable: only rows with a NULL embedding are processed, so it can be
 * stopped and re-run, and re-running after an import embeds just the new rows.
 *
 *   npm run fiqh:embed
 */
import { embedDocuments } from '../../lib/rag/embedder';
import { errorMessage } from '../../lib/errors';
import { supabaseAdmin as supabase } from '../../lib/supabase-server';

const PAGE = 1000;
const UPDATE_CONCURRENCY = 16;
/** e5 reads at most 512 tokens; the opening of a question carries its topic. */
const MAX_CHARS = 1500;

async function pendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from('fiqh_questions')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const total = await pendingCount();
  console.log(`${total} questions need embeddings`);
  if (total === 0) return;

  const started = Date.now();
  let done = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('fiqh_questions')
      .select('id, question_en, question_ar')
      .is('embedding', null)
      .limit(PAGE);
    if (error) throw error;
    if (!data?.length) break;

    // Each model batch is padded to its longest text; grouping similar lengths
    // keeps short questions from paying for a 500-token neighbour.
    const rows = data
      .map((r) => ({
        id: r.id as string,
        text: ((r.question_en as string) || (r.question_ar as string) || '').replace(/\s+/g, ' ').slice(0, MAX_CHARS),
      }))
      .sort((a, b) => a.text.length - b.text.length);
    const vectors = await embedDocuments(rows.map((r) => r.text));

    for (let i = 0; i < rows.length; i += UPDATE_CONCURRENCY) {
      const results = await Promise.all(
        rows.slice(i, i + UPDATE_CONCURRENCY).map((row, j) =>
          supabase
            .from('fiqh_questions')
            .update({ embedding: vectors[i + j] })
            .eq('id', row.id),
        ),
      );
      // A failed write would be re-selected forever; stop instead of looping.
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    }

    done += data.length;
    const rate = done / ((Date.now() - started) / 1000);
    const etaMin = Math.max(0, (total - done) / rate / 60);
    console.log(`${done}/${total}  (${rate.toFixed(1)}/s, ~${etaMin.toFixed(0)} min left)`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(errorMessage(err));
  process.exit(1);
});
