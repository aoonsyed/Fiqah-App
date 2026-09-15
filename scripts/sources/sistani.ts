import type { BookSource, ImportRecord } from '../../lib/rag/importer';
import { parseMasail } from '../../lib/rag/parser';
import { getText, htmlToText, sleep } from './http';

// The circulating PDF has no ToUnicode map and OCR of Nastaliq is unreliable,
// so the authoritative text comes from the office's own site.
const SITE = 'https://www.sistani.org';
const BOOK_URL = `${SITE}/urdu/book/61/`;
const DELAY_MS = 400;

export async function sistaniBooks(): Promise<BookSource[]> {
  return [
    {
      meta: {
        externalId: 'sistani-tauzeeh-ul-masail-ur',
        title: 'Tauzeeh ul Masail (توضیح المسائل)',
        author: 'Grand Ayatollah Sayyid ʿAlī al-Ḥusaynī al-Sīstānī',
        language: 'ur',
        docType: 'masail',
        sourceUrl: BOOK_URL,
      },
      isnad: false,
      load: async () => {
        const paths = [...new Set((await getText(BOOK_URL)).match(/\/urdu\/book\/61\/\d+\//g) ?? [])];
        const records: ImportRecord[] = [];

        for (const [s, path] of paths.entries()) {
          const url = SITE + path;
          const html = await getText(url);

          // <h1 class="c"> is the chapter; the page also has a site-title <h1>.
          const heading = html.match(/<h1[^>]*class="[^"]*\bc\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
          const chapter = heading ? htmlToText(heading) : `Section ${s + 1}`;
          const body = [...html.matchAll(/<div[^>]*class="[^"]*book-text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)]
            .map((m) => htmlToText(m[1]))
            .join('\n\n');

          parseMasail(body).forEach((m, k) =>
            records.push({ number: m.number ?? `${s + 1}.${k + 1}`, chapter, text: m.text, sourceUrl: url }),
          );
          await sleep(DELAY_MS);
        }
        return { records };
      },
    },
  ];
}
