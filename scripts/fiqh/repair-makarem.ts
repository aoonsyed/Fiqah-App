/**
 * Strips the makaremshirazi.ir page header/footer that earlier imports stored
 * as question and answer text, leaving the actual masala.
 *
 *   npm run fiqh:repair-makarem              # dry run: counts + samples
 *   npm run fiqh:repair-makarem -- --show="Types of Marriage"   # dry run, specific rows
 *   npm run fiqh:repair-makarem -- --apply   # backs up originals, then writes
 *   npm run fiqh:repair-makarem -- --apply --resume=.cache/makarem-repair-backup-<ts>.json
 *
 * Rewritten questions lose their embedding (migration 005 trigger), so run
 * `npm run fiqh:embed` afterwards.
 */
import fs from 'fs';
import path from 'path';
import { errorMessage } from '../../lib/errors';
import { supabaseAdmin as supabase } from '../../lib/supabase-server';
import { extractMakaremMasala } from '../sources/makarem';

const PAGE = 500;
const UPDATE_CONCURRENCY = 8;
/** A line on this many pages is navigation, not content. */
const BOILERPLATE_MIN_PAGES = 50;
/** Shorter than this, what's left isn't a usable answer. */
const MIN_ANSWER_CHARS = 15;
const NAV_LEFTOVER = /MITC|Table of Contents of Risalah|سروشتلگرام|Captcha|کدامنیتی|Toggle Dropdown/;

interface Row {
  fatwaId: string;
  questionId: string;
  question: string;
  answer: string;
}

async function loadRows(): Promise<Row[]> {
  const { data: marja, error } = await supabase
    .from('maraji')
    .select('id')
    .eq('slug', 'makarem-shirazi')
    .single();
  if (error) throw error;

  const rows: Row[] = [];
  // Keyset pagination: deep OFFSETs on this join hit the statement timeout.
  for (let after = '00000000-0000-0000-0000-000000000000'; ; ) {
    const { data } = await withRetry(() =>
      supabase
        .from('fatwas')
        .select('id, question_id, answer_en, fiqh_questions!inner(question_en)')
        .eq('marja_id', marja.id)
        .gt('id', after)
        .order('id')
        .limit(PAGE),
    );
    if (data?.length) after = data[data.length - 1]!.id as string;
    for (const r of data ?? []) {
      const q = r.fiqh_questions as unknown as { question_en: string };
      rows.push({
        fatwaId: r.id as string,
        questionId: r.question_id as string,
        question: q.question_en,
        answer: r.answer_en as string,
      });
    }
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

type Fix = Row & { newQuestion: string; newAnswer: string };

function pageText(r: Row): string {
  return `${r.question}\n${r.answer}`;
}

function boilerplateLines(rows: Row[]): Set<string> {
  const pages = new Map<string, number>();
  for (const r of rows) {
    for (const line of new Set(pageText(r).split('\n').map((l) => l.trim()).filter(Boolean))) {
      pages.set(line, (pages.get(line) ?? 0) + 1);
    }
  }
  return new Set([...pages].filter(([, n]) => n >= BOILERPLATE_MIN_PAGES).map(([line]) => line));
}

/** Supabase's statement timeout trips while the database is busy (e.g. flushing an index); a retry clears it. */
async function withRetry<T extends { error: unknown }>(request: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const result = await request();
    if (!result.error) return result;
    if (attempt >= 4) throw result.error;
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function writeFixes(fixes: Fix[]) {
  for (let i = 0; i < fixes.length; i += UPDATE_CONCURRENCY) {
    await Promise.all(
      fixes.slice(i, i + UPDATE_CONCURRENCY).map(async (f) => {
        await withRetry(() => supabase.from('fatwas').update({ answer_en: f.newAnswer }).eq('id', f.fatwaId));
        if (f.newQuestion !== f.question) {
          await withRetry(() =>
            supabase.from('fiqh_questions').update({ question_en: f.newQuestion }).eq('id', f.questionId),
          );
        }
      }),
    );
    if ((i / UPDATE_CONCURRENCY) % 50 === 0) console.log(`  ${Math.min(i + UPDATE_CONCURRENCY, fixes.length)}/${fixes.length}`);
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const resume = process.argv.find((a) => a.startsWith('--resume='))?.slice('--resume='.length);
  const rows = await loadRows();
  if (resume) {
    // An interrupted run already rewrote some rows; restore their original text
    // in memory so the same fixes are computed again (writes are idempotent).
    const originals = new Map((JSON.parse(fs.readFileSync(resume, 'utf8')) as Row[]).map((r) => [r.fatwaId, r]));
    for (const r of rows) {
      const o = originals.get(r.fatwaId);
      if (o) Object.assign(r, { question: o.question, answer: o.answer });
    }
  }
  const boilerplate = boilerplateLines(rows);
  console.log(`${rows.length} Makarem fatwas; ${boilerplate.size} repeated navigation lines`);

  const fixes: Fix[] = [];
  let clean = 0;
  let empty = 0;
  for (const r of rows) {
    const masala = extractMakaremMasala(pageText(r), boilerplate);
    if (!masala) {
      clean += 1; // no page header: already plain text
      continue;
    }
    if (masala.answer.length < MIN_ANSWER_CHARS) {
      empty += 1;
      continue;
    }
    fixes.push({ ...r, newQuestion: masala.question, newAnswer: masala.answer.slice(0, 8000) });
  }

  console.log(`to repair: ${fixes.length}; already clean: ${clean}; no recoverable answer (left as is): ${empty}`);
  const suspicious = fixes.filter((f) => NAV_LEFTOVER.test(f.newQuestion + f.newAnswer));
  console.log(`repaired text still containing navigation markers: ${suspicious.length}`);
  for (const f of suspicious.slice(0, 2)) console.log('  !', f.fatwaId, f.newAnswer.slice(0, 200));

  const show = process.argv.find((a) => a.startsWith('--show='))?.slice('--show='.length);
  const samples = show
    ? fixes.filter((f) => f.question.includes(show)).slice(0, 3)
    : [...fixes].sort(() => Math.random() - 0.5).slice(0, 4);
  for (const f of samples) {
    console.log('\n---');
    console.log('Q:', f.newQuestion.slice(0, 200));
    console.log('A:', f.newAnswer.slice(0, 300));
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.');
    return;
  }

  if (!resume) {
    const backupDir = path.join(process.cwd(), '.cache');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `makarem-repair-backup-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(fixes.map(({ fatwaId, questionId, question, answer }) => ({ fatwaId, questionId, question, answer }))));
    console.log(`
Backed up originals to ${backup}`);
    console.log(`If interrupted, re-run with --apply --resume=${backup}`);
  }

  console.log('Writing…');
  await writeFixes(fixes);
  console.log('Done. Now run: npm run fiqh:embed');
}

main().catch((err) => {
  console.error(errorMessage(err));
  process.exit(1);
});
