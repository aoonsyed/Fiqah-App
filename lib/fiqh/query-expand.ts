/** Expand user queries (typos, mixed language, fiqh synonyms) for better retrieval. */

const SYNONYMS: Record<string, string[]> = {
  music: ['music', 'song', 'songs', 'musik', 'nasheed', 'instrument'],
  prayer: ['prayer', 'salah', 'salat', 'namaz', 'salaat'],
  fasting: ['fasting', 'fast', 'sawm', 'ramadan', 'ramadhan'],
  khums: ['khums', 'kums', 'khoms', 'fifth'],
  zakat: ['zakat', 'zakah', 'charity', 'sadaqa', 'sadaqah'],
  wudu: ['wudu', 'wudhu', 'ablution', 'wuzu'],
  ghusl: ['ghusl', 'bath', 'ritual bath'],
  hajj: ['hajj', 'haj', 'pilgrimage', 'umrah', 'umra'],
  marriage: ['marriage', 'nikah', 'nikah', 'wedding', 'mahr'],
  divorce: ['divorce', 'talaq', 'khula'],
  interest: ['interest', 'riba', 'usury', 'loan'],
  halal: ['halal', 'halaal', 'permissible', 'allowed'],
  haram: ['haram', 'forbidden', 'prohibited'],
  travel: ['travel', 'traveling', 'travelling', 'journey', 'musafir'],
  mosque: ['mosque', 'masjid', 'jamaah', 'congregation'],
  taqlid: ['taqlid', 'marja', 'mujtahid', 'follow scholar'],
};

const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'i', 'my', 'can', 'do', 'does', 'what', 'when', 'how', 'if', 'it', 'be', 'with', 'about']);

export function tokenizeQuery(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Distinct search strings to try (original first). */
export function expandQueryVariants(raw: string): string[] {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const out = new Set<string>([trimmed]);
  const tokens = tokenizeQuery(trimmed);

  if (tokens.length >= 2) {
    out.add(tokens.join(' '));
    out.add(tokens.slice(0, 4).join(' '));
  }

  for (const t of tokens) {
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (syns.some((s) => s === t || t.includes(s) || s.includes(t))) {
        out.add(tokens.map((x) => (x === t ? key : x)).join(' '));
        out.add([key, ...tokens.filter((x) => x !== t)].join(' '));
      }
    }
  }

  // Common vowel-drop / typo: travling -> traveling via re-adding 'e'
  for (const t of tokens) {
    if (t.endsWith('ing') && t.length > 5) out.add(t.replace(/ing$/, 'e'));
    if (t.includes('salery') || t.includes('sallery')) out.add(trimmed.replace(/salle?ry/i, 'salary'));
  }

  return [...out].slice(0, 8);
}

export function tokensForFallback(raw: string): string[] {
  const tokens = tokenizeQuery(raw);
  const expanded = new Set(tokens);
  for (const t of tokens) {
    for (const syns of Object.values(SYNONYMS)) {
      if (syns.includes(t)) syns.forEach((s) => expanded.add(s));
    }
  }
  return [...expanded].slice(0, 6);
}
