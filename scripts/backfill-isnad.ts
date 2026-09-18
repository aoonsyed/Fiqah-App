/**
 * Fills the chain-of-narration field for narrations whose source stored the
 * chain and the report as one block (sunnah.com's books, parts of al-Kafi).
 *
 *   npx tsx --env-file=.env.local scripts/backfill-isnad.ts            # dry run
 *   npx tsx --env-file=.env.local scripts/backfill-isnad.ts --apply
 *   npx tsx --env-file=.env.local scripts/backfill-isnad.ts --book "Ṣaḥīḥ Muslim" --apply
 *
 * Only rows with an empty isnad_raw are touched. matn_arabic keeps the report
 * alone; the original text is always isnad_raw + ' ' + matn_arabic, so the
 * change can be undone by concatenation.
 *
 * Embeddings are not affected: chunks live in their own table and still hold
 * the full original text.
 */
import { supabaseAdmin as supabase } from '../lib/supabase-server';
import { splitIsnad } from '../lib/rag/isnad';

const PAGE = 500;
const WRITE_BATCH = 200;

interface Row {
  id: string;
  matn_arabic: string;
  book_id: string;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const bookFilter = args[args.indexOf('--book') + 1];
  const onlyBook = args.includes('--book') ? bookFilter : null;

  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, doc_type')
    .eq('doc_type', 'hadith')
    .order('title');
  if (booksError) throw booksError;

  const targets = (books ?? []).filter((b) => !onlyBook || b.title === onlyBook);
  if (!targets.length) {
    console.error(onlyBook ? `No hadith book titled "${onlyBook}"` : 'No hadith books found');
    process.exit(1);
  }

  console.log(apply ? 'APPLYING changes\n' : 'DRY RUN — pass --apply to write\n');
  let grandTotal = 0;
  let grandSplit = 0;

  for (const book of targets) {
    let scanned = 0;
    let split = 0;
    let updated = 0;
    let pending: Array<{ id: string; book_id: string; isnad_raw: string; matn_arabic: string }> = [];

    const flush = async () => {
      if (!apply || !pending.length) {
        pending = [];
        return;
      }
      // Upsert on the primary key: one request per batch instead of per row.
      // book_id is carried because it is NOT NULL and upsert writes whole rows.
      const { error } = await supabase.from('hadiths').upsert(pending, { onConflict: 'id' });
      if (error) throw error;

      updated += pending.length;
      pending = [];
    };

    // Cursor paging by id. Rows leave this filter as soon as they are written,
    // so an offset window would shift under us and skip rows.
    for (let cursor = ''; ; ) {
      let query = supabase
        .from('hadiths')
        .select('id, matn_arabic, book_id')
        .eq('book_id', book.id)
        .or('isnad_raw.is.null,isnad_raw.eq.')
        .order('id')
        .limit(PAGE);
      if (cursor) query = query.gt('id', cursor);

      const { data, error } = await query;
      if (error) throw error;
      if (!data?.length) break;

      for (const row of data as Row[]) {
        scanned++;
        const result = splitIsnad(row.matn_arabic);
        if (!result) continue;

        split++;
        pending.push({ id: row.id, book_id: row.book_id, isnad_raw: result.isnad, matn_arabic: result.matn });
        if (pending.length >= WRITE_BATCH) await flush();
      }

      cursor = data[data.length - 1].id;
      if (data.length < PAGE) break;
    }
    await flush();

    grandTotal += scanned;
    grandSplit += split;
    if (scanned) {
      const pct = Math.round((split / scanned) * 100);
      console.log(
        `${book.title.padEnd(48)} missing ${String(scanned).padStart(5)} | chain found ${String(split).padStart(5)} (${pct}%)${apply ? ` | written ${updated}` : ''}`,
      );
    }
  }

  console.log(
    `\nTotal: ${grandSplit} of ${grandTotal} narrations without a chain could be split` +
      (apply ? ' and were updated.' : '. Re-run with --apply to write them.'),
  );
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
