/** Map source book chapter headings to catalog subcategory slugs. */
const RULES: Array<{ test: RegExp; subSlug: string }> = [
  { test: /tahara|purif|wudu|ghusl|istinja/i, subSlug: 'taharah' },
  { test: /salah|prayer|namaz|salat/i, subSlug: 'salah' },
  { test: /fast|sawm|ramadan/i, subSlug: 'fasting' },
  { test: /hajj|umrah|pilgrim/i, subSlug: 'hajj-umrah' },
  { test: /khums/i, subSlug: 'khums' },
  { test: /zakat|charity|sadaqa/i, subSlug: 'zakat-sadaqa' },
  { test: /marriage|nikah|spouse|mahr/i, subSlug: 'marriage-contract' },
  { test: /divorce|talaq|khul/i, subSlug: 'divorce-talaq' },
  { test: /inherit|wasiyyah|will/i, subSlug: 'inheritance' },
  { test: /trade|sale|business|commerce|transaction/i, subSlug: 'sale-purchase' },
  { test: /interest|riba|loan|debt|bank/i, subSlug: 'riba-interest' },
  { test: /food|drink|halal|haram.*eat/i, subSlug: 'food-drink' },
  { test: /music|song|entertain/i, subSlug: 'music-entertainment' },
  { test: /hijab|dress|clothing/i, subSlug: 'dress-hijab' },
  { test: /medical|treatment|doctor|surgery/i, subSlug: 'medical-treatment' },
  { test: /organ|donat/i, subSlug: 'organ-donation' },
  { test: /internet|computer|phone|social media/i, subSlug: 'social-media' },
  { test: /game|gambl|lottery/i, subSlug: 'gambling-speculation' },
  { test: /taqlid|marja|follow/i, subSlug: 'taqlid-ijtihad' },
  { test: /travel|journey/i, subSlug: 'travel-prayer' },
  { test: /mosque|masjid|congregation|jama/i, subSlug: 'jamaah-congregation' },
  { test: /custody|child|nafaqah/i, subSlug: 'custody-nafaqah' },
];

const DEFAULT_SUB = 'taqlid-ijtihad';

export function chapterToSubcategorySlug(chapter: string): string {
  const hay = chapter.normalize('NFKC');
  for (const rule of RULES) {
    if (rule.test.test(hay)) return rule.subSlug;
  }
  return DEFAULT_SUB;
}

function hashSeed(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function slugifyQuestion(prefix: string, number: string, chapter: string, text?: string): string {
  const sig = hashSeed(`${chapter}|${number}|${text ?? ''}`);
  const base = `${prefix}-${number}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 48);
  return `${base}-${sig}`.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}
