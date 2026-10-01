import JSZip from 'jszip';
import type { BookSource, ImportRecord } from '../../lib/rag/importer';
import { getBuffer, htmlToText } from './http';

// leader.ir is the office's official site; its EPUB is clean Unicode, unlike the PDFs.
const BOOK_URL = 'https://www.leader.ir/en/book/32/Practical-Laws-of-Islam';
const EPUB_URL = 'https://www.leader.ir/en/book/32/epub/download/Practical-Laws-of-Islam';

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];

/** Content documents in reading order, per the OPF spine. */
async function spineDocuments(zip: JSZip): Promise<string[]> {
  const opfPath = Object.keys(zip.files).find((f) => f.endsWith('.opf'));
  if (!opfPath) throw new Error('EPUB has no OPF manifest');

  const base = opfPath.slice(0, opfPath.lastIndexOf('/') + 1);
  const opf = await zip.file(opfPath)!.async('string');
  const hrefById = new Map(
    (opf.match(/<item\b[^>]*>/g) ?? []).map((tag) => [attr(tag, 'id'), attr(tag, 'href')] as const),
  );

  const docs: string[] = [];
  for (const tag of opf.match(/<itemref\b[^>]*>/g) ?? []) {
    const href = hrefById.get(attr(tag, 'idref'));
    const file = href ? zip.file(base + href) : null;
    if (file) docs.push(await file.async('string'));
  }
  return docs;
}

export async function khameneiBooks(): Promise<BookSource[]> {
  return [
    {
      meta: {
        externalId: 'khamenei-practical-laws-en',
        title: 'Practical Laws of Islam (Ajwibat al-Istiftāʾāt)',
        author: 'Grand Ayatollah Sayyid ʿAlī Khamenei',
        language: 'en',
        docType: 'masail',
        sourceUrl: BOOK_URL,
      },
      isnad: false,
      load: async () => {
        const zip = await JSZip.loadAsync(await getBuffer(EPUB_URL));
        const records: ImportRecord[] = [];
        let chapter = 'General';

        // Each document is a topic heading followed by numbered question/answer
        // pairs. The book switches from "Q 56:" to "Q1815." partway through, so
        // both forms mark a question — matching only one merges hundreds together.
        for (const doc of await spineDocuments(zip)) {
          const text = htmlToText(doc).replace(/^Book\s*/, '');
          const first = text.search(/\bQ\s*\d+\s*[:.]/);
          if (first < 0) continue;

          const heading = text.slice(0, first).replace(/\s+/g, ' ').trim();
          if (heading && heading.length <= 200) chapter = heading;

          for (const block of text.slice(first).split(/(?=\bQ\s*\d+\s*[:.])/)) {
            const m = block.match(/^Q\s*(\d+)\s*[:.]\s*([\s\S]+)$/);
            if (m) {
              records.push({
                number: `Q ${m[1]}`,
                chapter,
                text: `Q: ${m[2].replace(/\s+/g, ' ').trim()}`,
                sourceUrl: BOOK_URL,
              });
            }
          }
        }
        return { records };
      },
    },
  ];
}
