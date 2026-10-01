/**
 * Read-only database security audit. Reports, for every table in `public`:
 *   - whether row-level security is on, and which policies exist
 *   - what the public anon key (shipped to every browser) can read
 *
 *   npm run security:db
 *
 * Writes nothing. A table with RLS off is readable AND writable by anyone
 * holding the anon key, so every row in that column should say "on".
 */
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { errorMessage } from '../../lib/errors';

function candidateUrls(): string[] {
  const direct = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (direct) return [direct];

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!password || !ref) throw new Error('Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.local.');

  const enc = encodeURIComponent(password);
  const urls: string[] = [];
  for (const prefix of ['aws-1', 'aws-0']) {
    for (const region of ['eu-west-1', 'ap-south-1', 'us-east-1', 'us-east-2', 'eu-central-1', 'ap-southeast-1']) {
      urls.push(`postgresql://postgres.${ref}:${enc}@${prefix}-${region}.pooler.supabase.com:5432/postgres`);
    }
  }
  urls.push(`postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`);
  return urls;
}

async function connect(): Promise<pg.Client> {
  let lastErr: unknown;
  for (const url of candidateUrls()) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
    }
  }
  throw lastErr;
}

async function main() {
  const db = await connect();
  const { rows } = await db.query<{ table: string; rls: boolean; policies: string | null }>(`
    SELECT c.relname AS table,
           c.relrowsecurity AS rls,
           string_agg(p.polname || ' (' || CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END || ')', ', ') AS policies
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    GROUP BY c.relname, c.relrowsecurity
    ORDER BY c.relrowsecurity, c.relname`);
  await db.end();

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

  let exposed = 0;
  console.log(`${'table'.padEnd(24)} ${'RLS'.padEnd(5)} ${'anon can read'.padEnd(16)} policies`);
  for (const r of rows) {
    const { count, error } = await anon.from(r.table).select('*', { count: 'exact', head: true });
    const anonRead = error ? `no (${error.code ?? 'denied'})` : `yes, ${count ?? 0} rows`;
    if (!r.rls) exposed++;
    console.log(`${r.table.padEnd(24)} ${(r.rls ? 'on' : 'OFF').padEnd(5)} ${anonRead.padEnd(16)} ${r.policies ?? '—'}`);
  }

  console.log(
    exposed
      ? `\n${exposed} table(s) have RLS OFF — anyone with the public anon key can read, edit and delete them. Run npm run fiqh:migrate.`
      : '\nAll public tables have RLS on.',
  );
  process.exitCode = exposed ? 1 : 0;
}

main().catch((err) => {
  console.error('Audit failed:', errorMessage(err));
  process.exit(2);
});
