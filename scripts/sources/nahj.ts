import type { BookSource, ImportRecord } from '../../lib/rag/importer';
import { curlText as getText, htmlToText, sleep, splitByScript } from './http';

const SITE = 'https://al-islam.org';
const SERMONS = '/nahjul-balagha-part-1-sermons';
const LETTERS = '/nahjul-balagha-part-2-letters-and-sayings';
const SAYINGS = `${LETTERS}/selections-sayings-and-preaching-amir-al-muminin-ali`;
const DELAY_MS = 300;

/** The page's text lives between Drupal's body field and the book navigation. */
function pageBody(html: string): string {
  const start = html.indexOf('field-name-body');
  if (start < 0) return '';
  const end = html.indexOf('book-navigation', start);
  return htmlToText(html.slice(html.indexOf('>', start) + 1, end < 0 ? undefined : end));
}

/** Index anchors like "Sermon 4: Through us you got guidance…", one per number. */
function indexEntries(html: string, prefix: string, kind: string): Array<[number, { path: string; title: string }]> {
  const anchor = new RegExp(`<a[^>]*href="(${prefix}/${kind}-(\\d+)[^"#?]*)"[^>]*>([\\s\\S]*?)</a>`, 'g');
  const byNumber = new Map<number, { path: string; title: string }>();

  for (const m of html.matchAll(anchor)) {
    const n = Number(m[2]);
    const title = htmlToText(m[3]);
    if (!byNumber.has(n) || title.length > byNumber.get(n)!.title.length) byNumber.set(n, { path: m[1], title });
  }
  return [...byNumber.entries()].sort((a, b) => a[0] - b[0]);
}

async function numberedPages(prefix: string, kind: string, label: string): Promise<ImportRecord[]> {
  const records: ImportRecord[] = [];

  for (const [n, { path, title }] of indexEntries(await getText(SITE + prefix), prefix, kind)) {
    const body = pageBody(await getText(SITE + path));
    if (body) {
      records.push({
        number: `${label} ${n}`,
        chapter: title || `${label} ${n}`,
        category: `${label}s`,
        ...splitByScript(body),
        sourceUrl: SITE + path,
      });
    }
    await sleep(DELAY_MS);
  }
  return records;
}

/** All sayings share one page, each introduced by "Hadith n. N". */
async function sayings(): Promise<ImportRecord[]> {
  const parts = pageBody(await getText(SITE + SAYINGS)).split(/Hadith n\.\s*(\d+)/);
  const records: ImportRecord[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    const body = parts[i + 1]
      .split('\n')
      .map((line) => line.replace(/^\d{1,4}\s*[.\-)]\s*/, ''))
      .join('\n')
      .trim();
    if (body) {
      records.push({
        number: `Saying ${parts[i]}`,
        chapter: 'Sayings',
        category: 'Sayings',
        ...splitByScript(body),
        sourceUrl: SITE + SAYINGS,
      });
    }
  }
  return records;
}

export async function nahjBooks(): Promise<BookSource[]> {
  return [
    {
      meta: {
        externalId: 'nahj-al-balagha',
        title: 'Nahj al-Balāgha',
        author: 'Imam ʿAlī b. Abī Ṭālib (a), compiled by al-Sharīf al-Raḍī (d. 406 AH)',
        language: 'ar',
        docType: 'hadith',
        sourceUrl: SITE + SERMONS,
      },
      isnad: false,
      load: async () => ({
        records: [
          ...(await numberedPages(SERMONS, 'sermon', 'Sermon')),
          ...(await numberedPages(LETTERS, 'letter', 'Letter')),
          ...(await sayings()),
        ],
      }),
    },
  ];
}
