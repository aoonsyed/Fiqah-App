import type { BookSource, ImportRecord } from '../../lib/rag/importer';
import type { HadithGrading } from '../../lib/rag/types';
import { getJson, request } from './http';

const API = 'https://www.thaqalayn-api.net/api';

interface ApiBook {
  bookId: string;
  BookName: string;
  author?: string;
}

interface ApiHadith {
  id: number;
  book?: string;
  category?: string;
  chapter?: string;
  author?: string;
  translator?: string;
  englishText?: string;
  arabicText?: string;
  majlisiGrading?: string;
  behdudiGrading?: string;
  mohseniGrading?: string;
  URL?: string;
}

/**
 * Gradings arrive as one blob per scholar:
 *   "Allamah Baqir al-Majlisi:  صحيح \n  - Mir'at al 'Uqul ... (1/25)"
 */
function parseGrading(raw: string | undefined, fallbackGrader: string): HadithGrading | null {
  if (!raw?.trim()) return null;

  const flat = raw.replace(/\s+/g, ' ').trim();
  const colon = flat.indexOf(':');
  const gradedBy = colon > 0 ? flat.slice(0, colon).trim() : fallbackGrader;
  const rest = colon > 0 ? flat.slice(colon + 1).trim() : flat;

  const dash = rest.search(/\s[-–—]\s/);
  const grade = (dash >= 0 ? rest.slice(0, dash) : rest).trim();
  const gradingSource = dash >= 0 ? rest.slice(dash + 3).trim() : undefined;

  return grade ? { grade, gradedBy, gradingSource } : null;
}

function toRecord(h: ApiHadith): ImportRecord {
  const arabic = (h.arabicText || '').trim();
  const english = (h.englishText || '').trim();
  const gradings = [
    parseGrading(h.majlisiGrading, 'Allamah Baqir al-Majlisi'),
    parseGrading(h.behdudiGrading, 'Shaykh Baqir al-Behbudi'),
    parseGrading(h.mohseniGrading, 'Shaykh Asif Mohseni'),
  ].filter((g): g is HadithGrading => g !== null);

  return {
    number: String(h.id),
    chapter: h.chapter?.trim() || h.category?.trim() || 'Uncategorised',
    category: h.category?.trim() || undefined,
    text: arabic || english,
    translation: arabic ? english || undefined : undefined,
    gradings: gradings.length ? gradings : undefined,
    sourceUrl: h.URL,
  };
}

export async function thaqalaynBooks(): Promise<BookSource[]> {
  const books = await getJson<ApiBook[]>(`${API}/v2/allbooks`);

  return books.map((b) => ({
    meta: {
      externalId: b.bookId,
      title: b.BookName,
      author: b.author,
      language: 'ar',
      docType: 'hadith',
      sourceUrl: `https://thaqalayn.net/book/${b.bookId}`,
    },
    load: async () => {
      // 14 catalogued books aren't served: v1 rejects their ids, v2 and GraphQL return empty.
      const res = await request(`${API}/${b.bookId}`);
      const body = res.ok ? await res.json() : [];
      if (!Array.isArray(body) || body.length === 0) return { records: [] };

      const first = body[0] as ApiHadith;
      return {
        records: (body as ApiHadith[]).map(toRecord),
        meta: { title: first.book || b.BookName, author: first.author || b.author, translator: first.translator },
      };
    },
  }));
}
