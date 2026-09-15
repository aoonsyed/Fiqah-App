/**
 * Imports structured sources into the corpus.
 *
 *   npm run import -- all                          # every source, in order
 *   npm run import -- sunnah nahj                  # selected sources
 *   npm run import -- thaqalayn --book Al-Tawhid-Saduq
 *   npm run import -- all --list | --dry-run | --force
 *
 * Resumable and single-instance: completed books are skipped, interrupted ones
 * redone, and a lock stops two runs from corrupting each other.
 */
import { acquireImportLock, dryRunBook, importBook, type BookSource } from '../lib/rag/importer';
import { errorMessage } from '../lib/errors';
import { khameneiBooks } from './sources/khamenei';
import { nahjBooks } from './sources/nahj';
import { sistaniBooks } from './sources/sistani';
import { sunnahBooks } from './sources/sunnah';
import { thaqalaynBooks } from './sources/thaqalayn';

const SOURCES: Record<string, () => Promise<BookSource[]>> = {
  thaqalayn: thaqalaynBooks,
  sistani: sistaniBooks,
  khamenei: khameneiBooks,
  nahj: nahjBooks,
  sunnah: sunnahBooks,
};

// Measured on this machine during the Thaqalayn run.
const CHUNKS_PER_SECOND = 2;

async function main() {
  const args = process.argv.slice(2);
  const has = (flag: string) => args.includes(flag);
  const bookArg = args.indexOf('--book');
  const onlyBooks = bookArg >= 0 ? (args[bookArg + 1] ?? '').split(',').filter(Boolean) : [];
  const names = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--book');
  const selected = names.includes('all') ? Object.keys(SOURCES) : names;
  const unknown = selected.filter((n) => !SOURCES[n]);

  if (selected.length === 0 || unknown.length) {
    if (unknown.length) console.error(`unknown source: ${unknown.join(', ')}`);
    console.error(`usage: npm run import -- <${Object.keys(SOURCES).join('|')}|all> [--book <id,...>] [--list] [--dry-run] [--force]`);
    process.exit(1);
  }

  let books: BookSource[] = [];
  for (const name of selected) books.push(...(await SOURCES[name]()));
  if (onlyBooks.length) books = books.filter((b) => onlyBooks.includes(b.meta.externalId));

  if (has('--list')) {
    for (const b of books) console.log(`  ${b.meta.externalId.padEnd(40)} ${b.meta.title}`);
    return;
  }

  if (has('--dry-run')) {
    let records = 0;
    let chunks = 0;
    for (const b of books) {
      try {
        const r = await dryRunBook(b);
        records += r.records;
        chunks += r.chunks;
      } catch (err) {
        console.error(`  ${b.meta.externalId} FAILED: ${errorMessage(err)}`);
      }
    }
    console.log(
      `\ntotal: ${records.toLocaleString()} records, ${chunks.toLocaleString()} chunks — ` +
        `~${(chunks / CHUNKS_PER_SECOND / 3600).toFixed(1)} h to embed (ignores books already imported)`,
    );
    return;
  }

  acquireImportLock();
  const started = Date.now();
  const failed: string[] = [];

  for (const [i, b] of books.entries()) {
    console.log(`[${i + 1}/${books.length}] ${b.meta.title}`);
    try {
      await importBook(b, { force: has('--force') });
    } catch (err) {
      failed.push(b.meta.externalId);
      console.error(`\n  FAILED: ${errorMessage(err)}`);
    }
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(
    `\ndone in ${mins} min` + (failed.length ? ` — ${failed.length} failed (re-run to resume): ${failed.join(', ')}` : ''),
  );
}

main().catch((err) => {
  console.error(errorMessage(err));
  process.exit(1);
});
