import { execFile } from 'child_process';
import { promisify } from 'util';
import { withRetry } from '../../lib/rag/importer';

const execFileAsync = promisify(execFile);

// Several sources (al-islam.org, leader.ir) answer 403 to non-browser agents.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with retries on network errors, 429 and 5xx; other statuses are returned as-is. */
export function request(url: string): Promise<Response> {
  return withRetry(`GET ${url}`, async () => {
    const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
    if (res.status === 429 || res.status >= 500) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  });
}

async function ok(url: string): Promise<Response> {
  const res = await request(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res;
}

export const getText = async (url: string) => (await ok(url)).text();

/**
 * Fetches via the system curl. al-islam.org's Cloudflare rejects Node's fetch
 * regardless of headers (it fingerprints the TLS client) but admits curl.
 */
export function curlText(url: string): Promise<string> {
  return withRetry(`curl ${url}`, async () => {
    const { stdout } = await execFileAsync(
      'curl',
      ['-sSL', '--compressed', '-A', BROWSER_UA, '-w', '\n%{http_code}', url],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    const status = Number(stdout.slice(stdout.lastIndexOf('\n') + 1));
    if (status !== 200) throw new Error(`curl ${url} -> ${status}`);
    return stdout.slice(0, stdout.lastIndexOf('\n'));
  });
}
export const getJson = async <T>(url: string) => (await ok(url)).json() as Promise<T>;
export const getBuffer = async (url: string) => Buffer.from(await (await ok(url)).arrayBuffer());

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', mdash: '—', ndash: '–', prime: '′',
};

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/<[^>]*$/, '') // tag cut off at a slice boundary
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** Separates interleaved bilingual text into its Arabic-script lines and the rest. */
export function splitByScript(text: string): { text: string; translation?: string } {
  const arabic: string[] = [];
  const other: string[] = [];

  for (const line of text.split('\n')) {
    const letters = line.match(/\p{L}/gu)?.length ?? 0;
    const script = line.match(/[؀-ۿﭐ-﻿]/g)?.length ?? 0;
    (letters > 0 && script / letters > 0.5 ? arabic : other).push(line);
  }

  const original = arabic.join('\n');
  const rest = other.join('\n');
  return original ? { text: original, translation: rest || undefined } : { text: rest };
}
