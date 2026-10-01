import { getText, htmlToText, sleep } from './http';

const SITE = 'https://makaremshirazi.ir';

export type MakaremLocale = 'en' | 'fa';

export interface MakaremMasala {
  id: string;
  kind: 'istifta' | 'treatise';
  path: string;
  title: string;
  questionEn: string;
  answerEn: string;
  breadcrumbs: string;
}

function localePrefix(locale: MakaremLocale): string {
  return `/ahkam/${locale}`;
}

const istiftaRe = (locale: MakaremLocale) =>
  new RegExp(`href="(\\/ahkam\\/${locale}\\/home\\/istifta\\/(\\d+)\\/[^"]+)"`, 'g');
const treatiseRe = (locale: MakaremLocale) =>
  new RegExp(`href="(\\/ahkam\\/${locale}\\/home\\/treatise\\/(\\d+)\\/[^"]+)"`, 'g');
const categoryRe = (locale: MakaremLocale) =>
  new RegExp(`href="(\\/ahkam\\/${locale}\\/(?:category\\/index|treatise\\/category)\\/\\d+\\/[^"?]+)`, 'g');

function decodePath(p: string): string {
  return p.replace(/&amp;/g, '&').split('?')[0]!;
}

function extractLinks(
  html: string,
  locale: MakaremLocale,
  paths: Map<string, { kind: 'istifta' | 'treatise'; path: string; id: string }>,
) {
  for (const m of html.matchAll(istiftaRe(locale))) {
    const path = decodePath(m[1]!);
    paths.set(`i-${m[2]}`, { kind: 'istifta', path, id: m[2]! });
  }
  for (const m of html.matchAll(treatiseRe(locale))) {
    const path = decodePath(m[1]!);
    paths.set(`t-${m[2]}`, { kind: 'treatise', path, id: m[2]! });
  }
}

/** Discover istifta + treatise detail paths via list pages and category BFS. */
export async function discoverMakaremPaths(opts?: {
  locale?: MakaremLocale;
  maxTreatisePages?: number;
  maxHomePages?: number;
  delayMs?: number;
}): Promise<Array<{ kind: 'istifta' | 'treatise'; path: string; id: string }>> {
  const locale = opts?.locale ?? 'en';
  const lp = localePrefix(locale);
  const maxTreatisePages = opts?.maxTreatisePages ?? 250;
  const maxHomePages = opts?.maxHomePages ?? 15;
  const delayMs = opts?.delayMs ?? 200;
  const paths = new Map<string, { kind: 'istifta' | 'treatise'; path: string; id: string }>();
  const categories = new Set<string>();
  let staleTreatise = 0;
  let lastTreatiseSize = 0;

  for (let p = 1; p <= maxTreatisePages; p++) {
    const html = await getText(`${SITE}${lp}/treatise/index?page=${p}&sortby=0&sort=1&view=0`);
    const before = paths.size;
    extractLinks(html, locale, paths);
    for (const m of html.matchAll(categoryRe(locale))) categories.add(decodePath(m[1]!));
    if (paths.size === before) staleTreatise++;
    else staleTreatise = 0;
    if (staleTreatise >= 8 && p > 10) break;
    if (paths.size === lastTreatiseSize && p > 60) break;
    lastTreatiseSize = paths.size;
    await sleep(delayMs);
  }

  for (let p = 1; p <= maxHomePages; p++) {
    const html = await getText(`${SITE}${lp}/home/index?page=${p}&sortby=0&sort=0&view=0`);
    extractLinks(html, locale, paths);
    const catHomeRe = new RegExp(`href="(\\/ahkam\\/${locale}\\/category\\/index\\/\\d+\\/[^"?]+)`, 'g');
    for (const m of html.matchAll(catHomeRe)) categories.add(decodePath(m[1]!));
    await sleep(delayMs);
  }

  const catQueue = [...categories];
  const visitedCat = new Set<string>();
  while (catQueue.length) {
    const cat = catQueue.shift()!;
    if (visitedCat.has(cat)) continue;
    visitedCat.add(cat);
    for (let p = 1; p <= 25; p++) {
      let html: string;
      try {
        html = await getText(`${SITE}${cat}?page=${p}&sortby=0&sort=0&view=0`);
      } catch {
        break;
      }
      const before = paths.size;
      extractLinks(html, locale, paths);
      for (const m of html.matchAll(categoryRe(locale))) {
        const c = decodePath(m[1]!);
        if (!visitedCat.has(c)) catQueue.push(c);
      }
      if (paths.size === before) break;
      await sleep(delayMs);
    }
  }

  return [...paths.values()];
}

/**
 * Every page is: <title> line, a fixed header (search box, enquiry form,
 * captcha), the share-buttons line, then the masala, then a footer of
 * categories, keywords and sidebar links. Only the part between the share
 * line and the footer is content. Earlier imports kept the header and footer,
 * so many stored "answers" were just the site's navigation.
 */
const SHARE_LINE = /^(?:اشتراک(?: گذاری)?|Share)\s*سروش/;
const OFFICE_SUFFIX = /\s*(?:دفتر مرجع عالیقدر حضرت آیت الله العظمی مکارم شیرازی|Grand Ayatollah Makarem Shirazi's Ofiice)\s*$/;
/** First footer line; everything from here on is navigation. */
const FOOTER_LINE = new RegExp(
  '^(?:' +
    [
      'دسته‌ها:', 'Categories:', 'کلیدواژه ها:', 'Keywords:', 'جدیدترین مسائل', 'Newest Issues',
      'مسائلی که بهتر است بدانید', 'سوالات شرعی و فقهی خود را بپرسید', 'Ask Your Jurisprudential Questions',
      'Table of Contents of Risalah', 'فهرست رساله', 'Fiqh tree directory', 'درختواره فقه',
      'استفاده از مطالب با ذکر منبع',
    ].join('|') +
    ')',
);
/** Risalah pages repeat the title as "مسئله شماره <title>…" above the ruling. */
const TREATISE_HEADER = /^مسئله شماره/;
/** A numbered risalah ruling: "Issue No.744- …" or "مسأله 1354ـ …". */
const RULING_START = /^(?:Issue No\.?\s*\d+|مسأله\s*\d+)/;

export interface ExtractedMasala {
  title: string;
  question: string;
  answer: string;
}

/**
 * Pulls title, question and answer out of a page's plain text.
 * `boilerplate` is an optional set of lines known to repeat across pages
 * (sidebar links change over time, so no fixed list catches them all).
 */
export function extractMakaremMasala(text: string, boilerplate?: Set<string>): ExtractedMasala | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] ?? '').replace(/^\|\s*/, '').replace(OFFICE_SUFFIX, '').trim();

  let start = -1;
  lines.forEach((l, i) => {
    if (SHARE_LINE.test(l)) start = i + 1;
  });
  if (start < 0 || !title) return null;

  const body: string[] = [];
  for (const line of lines.slice(start)) {
    if (FOOTER_LINE.test(line)) break;
    const bare = line.replace(/\s*\(\d+\)$/, '');
    if (bare === title || TREATISE_HEADER.test(line)) continue;
    // Sidebar links follow the content directly on risalah pages.
    if (boilerplate?.has(line) && body.length > 0) break;
    body.push(line);
  }

  const rulingAt = body.findIndex((l) => RULING_START.test(l));
  if (rulingAt >= 0) {
    // Risalah: the ruling paragraph plus any continuation lines, which end
    // in punctuation; short unpunctuated lines after it are sidebar titles.
    const ruling = [body[rulingAt]!];
    for (const line of body.slice(rulingAt + 1)) {
      if (!/[.:؛)]$/.test(line)) break;
      ruling.push(line);
    }
    return { title, question: title, answer: ruling.join('\n\n') };
  }

  // Istifta: question lines up to the first "?", then the answer.
  const qEnd = body.findIndex((l, i) => i < 4 && /[?؟]\s*$/.test(l));
  if (qEnd >= 0 && qEnd < body.length - 1) {
    return {
      title,
      question: body.slice(0, qEnd + 1).join('\n'),
      answer: body.slice(qEnd + 1).join('\n\n'),
    };
  }
  return body.length ? { title, question: title, answer: body.join('\n\n') } : null;
}

export function parseMakaremDetailPage(
  html: string,
  kind: 'istifta' | 'treatise',
): Omit<MakaremMasala, 'id' | 'kind' | 'path'> | null {
  const text = htmlToText(html);
  const masala = extractMakaremMasala(text);
  if (!masala) return null;

  const breadcrumbParts: string[] = [];
  for (const line of text.split('\n')) {
    if (/^(Prayer|Fasting|Khums|Hajj|Trade|Marriage|Purity|Taharah|نماز|روزه)/i.test(line)) {
      breadcrumbParts.push(line);
    }
  }
  const breadcrumbs = breadcrumbParts.slice(0, 4).join(' > ') || kind;

  return {
    title: masala.title,
    questionEn: masala.question,
    answerEn: masala.answer.slice(0, 8000),
    breadcrumbs,
  };
}

export async function fetchMakaremMasala(item: {
  kind: 'istifta' | 'treatise';
  path: string;
  id: string;
}): Promise<MakaremMasala | null> {
  const html = await getText(`${SITE}${item.path}`);
  const parsed = parseMakaremDetailPage(html, item.kind);
  if (!parsed || parsed.answerEn.length < 15) return null;
  return { ...item, ...parsed };
}
