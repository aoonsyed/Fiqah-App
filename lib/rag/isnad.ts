/**
 * Splits an Arabic narration into its chain of transmission (isnad) and the
 * report itself (matn).
 *
 * Sources like sunnah.com deliver both as one block:
 *
 *   حدثنا أبو بكر بن أبي شيبة، وزهير بن حرب، قالا حدثنا وكيع، عن سفيان، عن حبيب،
 *   عن أبي العباس، عن عبد الله بن عمرو، قال جاء رجل إلى النبي ﷺ …
 *                                                  ^ the report starts here
 *
 * The chain is a run of transmission verbs (حدثنا, أخبرنا) and links (عن). It
 * ends at the *last* link, where the final narrator starts reporting — not the
 * first, because chains branch ("قال يحيى أخبرنا …") and a report can itself
 * contain "قال".
 *
 * Pure functions, no I/O: the same code serves the backfill script and imports.
 */

/** Diacritics (harakat) and tatweel, which break literal matching. */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/;

interface Normalized {
  text: string;
  /** Index in the original string for each character of `text`. */
  map: number[];
}

/**
 * Removes diacritics and unifies letter shapes, keeping a map back to the
 * original. Cutting on a normalized index without the map slices mid-word,
 * because every stripped harakat shifts everything after it.
 */
function normalize(input: string): Normalized {
  let text = '';
  const map: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (DIACRITICS.test(ch)) continue;

    text += 'أإآ'.includes(ch) ? 'ا' : ch === 'ى' ? 'ي' : ch === 'ة' ? 'ه' : ch;
    map.push(i);
  }
  map.push(input.length); // so a cut at the very end maps cleanly

  return { text, map };
}

/** Leading numbering the sources prefix to a narration: "3ـ", "18 - ", "500 -". */
const NUMBERING = /^[\s٠-٩\d]*[-ـ.:]?\s*/;

/** Transmission verbs and links. The last one ends the chain. */
const LINK = /(?:حدثنا|حدثني|حدثنيه|اخبرنا|اخبرني|انبانا|انباني|قرات على|رفعه|باسناده|عن)(?=\s|$)/g;

/**
 * What a narrator says once the chain is complete. Deliberately excludes bare
 * كان ("was"), which is ordinary prose and cut sermons mid-sentence.
 */
const REPORT_MARKER = /(?:انه\s+قال|انها\s+قالت|قال(?:ت|وا|ا)?|يقول|سئل|قيل|ان\s)(?=\s|$|:)/g;

/** Transmission verbs — a real chain names how it was received, not just "عن". */
const TRANSMISSION_VERB = /(?:حدثنا|حدثني|حدثنيه|اخبرنا|اخبرني|انبانا|انباني|قرات على|رفعه|باسناده|رويته|روي عن)/;

/** A chain must start near the beginning, or the text is a report, not a chain. */
const OPENER_WINDOW = 120;
/** Beyond this, a "link" is almost certainly part of the report. */
const MAX_ISNAD_RATIO = 0.75;
const MIN_MATN_CHARS = 15;
/** A chain always names at least one intermediary. */
const MIN_ISNAD_CHARS = 12;

export interface IsnadSplit {
  isnad: string;
  matn: string;
}

/**
 * Index of the last chain link within the chain's plausible span, or -1 when
 * the text has no chain.
 *
 * Sermons and biographical notes also contain "عن", so a lone link is not
 * enough: the text must either name how it was transmitted (حدثنا, أخبرنا) or
 * show at least two links, which prose almost never does up front.
 */
function lastLinkEnd(flat: string): number {
  const limit = flat.length * MAX_ISNAD_RATIO;
  let end = -1;
  let first = -1;
  let links = 0;

  LINK.lastIndex = 0;
  for (let m = LINK.exec(flat); m; m = LINK.exec(flat)) {
    if (first < 0) first = m.index;
    if (m.index > limit) break;
    end = m.index + m[0].length;
    links++;
  }

  // The chain has to open the narration; a link appearing later belongs to the report.
  if (first < 0 || first > OPENER_WINDOW) return -1;
  if (links < 2 && !TRANSMISSION_VERB.test(flat.slice(0, end))) return -1;
  return end;
}

/**
 * Returns the chain and the remaining report, or null when the text doesn't
 * begin with a chain (Nahj al-Balagha's sermons, fiqh rulings, and narrations
 * whose source stored the matn alone).
 */
export function splitIsnad(text: string): IsnadSplit | null {
  if (!text) return null;

  const { text: flat, map } = normalize(text);
  const end = lastLinkEnd(flat);
  if (end < 0) return null;

  // After the final narrator's name comes the report marker: cut just before it.
  REPORT_MARKER.lastIndex = end;
  const marker = REPORT_MARKER.exec(flat);
  if (!marker) return null;

  const cut = map[marker.index];
  const isnad = text.slice(0, cut).trim().replace(/[،,]\s*$/, '');
  const matn = text.slice(cut).trim();

  if (isnad.replace(NUMBERING, '').length < MIN_ISNAD_CHARS) return null;
  if (matn.length < MIN_MATN_CHARS) return null;
  if (cut > text.length * MAX_ISNAD_RATIO) return null;

  return { isnad, matn };
}

/** True when the text opens with a chain, whether or not it can be split. */
export function hasIsnad(text: string): boolean {
  return !!text && lastLinkEnd(normalize(text).text) >= 0;
}

/* ------------------------------------------------------------------ *
 * Reading a chain as a sequence of people
 * ------------------------------------------------------------------ */

/** How one narrator received the report from the next. */
export type LinkKind = 'narrated' | 'from' | 'raised' | 'heard' | 'read';

export interface ChainStep {
  /** The narrator's name as written, diacritics kept. */
  name: string;
  /** How this narrator received it from the one below. */
  link: LinkKind;
}

/** Chains branch ("ح"), so a narration can reach us by several routes. */
export interface ChainRoute {
  steps: ChainStep[];
}

const LINK_KINDS: Array<{ pattern: RegExp; kind: LinkKind }> = [
  { pattern: /^(?:و?\s*حدثنا|و?\s*حدثني|حدثنيه|نا|ثنا)$/, kind: 'narrated' },
  { pattern: /^(?:و?\s*اخبرنا|و?\s*اخبرني|انبانا|انباني)$/, kind: 'narrated' },
  { pattern: /^سمعت$/, kind: 'heard' },
  { pattern: /^قرات على$/, kind: 'read' },
  { pattern: /^رفعه$/, kind: 'raised' },
  { pattern: /^عن$/, kind: 'from' },
];

/** Connectors, matched on normalized text and mapped back to the original. */
const CONNECTOR =
  /(?:و\s*)?(?:حدثنا|حدثني|حدثنيه|اخبرنا|اخبرني|انبانا|انباني|قرات على|سمعت|رفعه|عن|ان)(?=\s)/g;

/** The branch marker: "ح" alone means a second route to the same report. */
const BRANCH = /(?:^|\s)ح(?=\s|$)/g;

const KIND_OF: Array<{ pattern: RegExp; kind: LinkKind }> = [
  // "أن فلانا قال": the next name is the source, same as عن.
  { pattern: /^(?:و\s*)?ان$/, kind: 'from' },
  { pattern: /سمعت/, kind: 'heard' },
  { pattern: /قرات على/, kind: 'read' },
  { pattern: /رفعه/, kind: 'raised' },
  { pattern: /^(?:و\s*)?عن$/, kind: 'from' },
];

const kindOf = (connector: string): LinkKind =>
  KIND_OF.find((k) => k.pattern.test(connector))?.kind ?? 'narrated';

/** Words that trail a name but belong to the joint, not the person. */
const TRAILING_NOISE = new Set(['قال', 'قالا', 'قالوا', 'جميعا', 'كلهم', 'كلاهما', 'و']);
/** Openers that belong to the report, not the last narrator's name. */
const LEADING_NOISE = /^(?:ان|انه|انها)\s+/;

/** Noise around a name that isn't part of it. */
function cleanName(raw: string): string {
  let name = raw
    .replace(NUMBERING, '')
    .replace(/^[\s،,:؛\-ـ]+|[\s،,:؛\-ـ]+$/g, '')
    // "- يعني ابن جعفر -" and "- وهو ابن زيد -": the compiler identifying a narrator.
    .replace(/^-?\s*(?:يعني|وهو|يعنون)\s*/, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Compare on normalized tokens: "قَالاَ" and "قالا" must both be recognised.
  for (;;) {
    const tokens = name.split(' ');
    const last = normalize(tokens[tokens.length - 1] ?? '').text.replace(/[،,]/g, '');
    if (tokens.length > 1 && TRAILING_NOISE.has(last)) {
      name = tokens.slice(0, -1).join(' ').replace(/[،,]\s*$/, '').trim();
      continue;
    }
    break;
  }

  const flat = normalize(name).text;
  const lead = flat.match(LEADING_NOISE);
  if (lead) name = name.slice(name.length - (flat.length - lead[0].length)).trim();

  return name;
}

/**
 * Reads a chain into an ordered list of narrators, nearest transmitter first.
 *
 * Turns "حدثنا أبو بكر، عن سفيان، عن حبيب" into the three people and how each
 * received it, so the app can show who heard from whom instead of a wall of
 * Arabic. Returns an empty array when nothing name-like can be found.
 */
export function parseChain(isnad: string): ChainRoute[] {
  if (!isnad?.trim()) return [];

  const { text: flat, map } = normalize(isnad);

  // Cut points of every connector, in the ORIGINAL string's coordinates.
  const marks: Array<{ start: number; end: number; kind: LinkKind; branch: boolean }> = [];

  BRANCH.lastIndex = 0;
  for (let m = BRANCH.exec(flat); m; m = BRANCH.exec(flat)) {
    marks.push({ start: map[m.index], end: map[m.index + m[0].length], kind: 'narrated', branch: true });
  }
  CONNECTOR.lastIndex = 0;
  for (let m = CONNECTOR.exec(flat); m; m = CONNECTOR.exec(flat)) {
    marks.push({ start: map[m.index], end: map[m.index + m[0].length], kind: kindOf(m[0]), branch: false });
  }
  marks.sort((a, b) => a.start - b.start);

  const routes: ChainRoute[] = [];
  let steps: ChainStep[] = [];
  // Text before the first connector is a lead narrator (al-Kafi's style) or numbering.
  let link: LinkKind = 'narrated';
  let cursor = 0;

  const pushName = (raw: string, kind: LinkKind) => {
    const name = cleanName(raw);
    if (name.length >= 3) steps.push({ name, link: kind });
  };

  for (const mark of marks) {
    pushName(isnad.slice(cursor, mark.start), link);
    cursor = mark.end;

    if (mark.branch) {
      // A new route starts; the names so far form a complete one.
      if (steps.length) routes.push({ steps });
      steps = [];
      link = 'narrated';
    } else {
      link = mark.kind;
    }
  }
  pushName(isnad.slice(cursor), link);

  if (steps.length) routes.push({ steps });
  return routes;
}

/** Chain for a narration, reading it out of the text when the field is empty. */
export function chainOf(isnadRaw: string | undefined, matnArabic: string | undefined): ChainRoute[] {
  if (isnadRaw?.trim()) return parseChain(isnadRaw);

  const split = matnArabic ? splitIsnad(matnArabic) : null;
  return split ? parseChain(split.isnad) : [];
}
