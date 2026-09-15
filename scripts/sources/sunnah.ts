import type { BookSource, ImportRecord } from '../../lib/rag/importer';
import { getJson } from './http';

// fawazahmed0/hadith-api: static JSON on jsDelivr, no key or rate limit.
const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

const SIHAH_SITTA = [
  { key: 'bukhari', title: 'Ṣaḥīḥ al-Bukhārī', author: 'Imam Muḥammad b. Ismāʿīl al-Bukhārī (d. 256 AH)' },
  { key: 'muslim', title: 'Ṣaḥīḥ Muslim', author: 'Imam Muslim b. al-Ḥajjāj (d. 261 AH)' },
  { key: 'abudawud', title: 'Sunan Abī Dāwūd', author: 'Abū Dāwūd al-Sijistānī (d. 275 AH)' },
  { key: 'tirmidhi', title: 'Jāmiʿ al-Tirmidhī', author: 'Abū ʿĪsā al-Tirmidhī (d. 279 AH)' },
  { key: 'nasai', title: 'Sunan al-Nasāʾī', author: 'Aḥmad b. Shuʿayb al-Nasāʾī (d. 303 AH)' },
  { key: 'ibnmajah', title: 'Sunan Ibn Mājah', author: 'Ibn Mājah al-Qazwīnī (d. 273 AH)' },
];

interface Edition {
  metadata: { sections: Record<string, string> };
  hadiths: Array<{
    hadithnumber: number;
    text: string;
    grades?: Array<{ name: string; grade: string }>;
    reference?: { book: number };
  }>;
}

export async function sunnahBooks(): Promise<BookSource[]> {
  return SIHAH_SITTA.map((c) => ({
    meta: {
      externalId: `sunnah-${c.key}`,
      title: c.title,
      author: c.author,
      language: 'ar',
      docType: 'hadith',
      sourceUrl: `https://sunnah.com/${c.key}`,
    },
    load: async () => {
      const [ar, en] = await Promise.all([
        getJson<Edition>(`${CDN}/ara-${c.key}.min.json`),
        getJson<Edition>(`${CDN}/eng-${c.key}.min.json`),
      ]);
      const english = new Map(en.hadiths.map((h) => [h.hadithnumber, h]));

      const records: ImportRecord[] = ar.hadiths.map((h) => {
        const e = english.get(h.hadithnumber);
        const arabic = h.text?.trim() || '';
        const translation = e?.text?.trim() || '';
        const section = String(h.reference?.book ?? '');
        const sectionName = en.metadata.sections[section]?.trim();
        const grades = e?.grades?.length ? e.grades : h.grades ?? [];

        return {
          number: String(h.hadithnumber),
          chapter: sectionName ? `${section}. ${sectionName}` : 'Introduction',
          text: arabic || translation,
          translation: arabic ? translation || undefined : undefined,
          gradings: grades.length ? grades.map((g) => ({ grade: g.grade, gradedBy: g.name })) : undefined,
          sourceUrl: `https://sunnah.com/${c.key}:${h.hadithnumber}`,
        };
      });

      return { records };
    },
  }));
}
