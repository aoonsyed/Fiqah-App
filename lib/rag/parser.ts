/**
 * Hadith structure parser
 * Extracts hadith components: isnad (chain), matn (content), grading
 *
 * Handles Arabic and English/Urdu texts with various formatting patterns
 */

import type { DocType } from './types';

export interface ParsedHadith {
  isnadRaw: string;
  narrators: string[];
  matn: string;
  grading?: string;
  hadithNumber?: string;
}

/** Urdu/Arabic-Indic digits used for ruling numbers, alongside ASCII. */
const DIGITS = '0-9٠-٩۰-۹';

// Urdu writes heh as ہ (U+06C1) or ھ (U+06BE); Arabic uses ه / ة. All four appear
// across editions, so the heading class must accept every form.
const HEH = 'هہھة';
const MASALA_WORD = `(?:مس(?:ئ|أ|ـ)?ل[${HEH}]|مسل[${HEH}]|masala|mas'ala|issue|ruling)`;

// Separators seen between the word and its number across editions and sources:
// "مسئلہ ۱", "مسئلہ: ۱", "مسئلہ (۱)" (sistani.org), "مسأله - 12", "Masala 7".
const SEP = '[\\s:.\\-–—()\\[\\]]*';

/** Start of a numbered ruling. */
const MASALA_START = new RegExp(`${MASALA_WORD}${SEP}[${DIGITS}]+`, 'i');
const MASALA_SPLIT = new RegExp(`(?=${MASALA_WORD}${SEP}[${DIGITS}]+)`, 'gi');

const ISNAD_MARKERS = /عَنْ|عن\s|حدثنا|أخبرنا|روى|بإسناده|narrated (?:from|by)|it is related/gi;

function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Decides whether a document reads as a narration collection or a fiqh manual,
 * by comparing how often isnad markers appear against numbered-ruling headings.
 */
export function detectDocType(text: string): DocType {
  const sample = text.slice(0, 200_000);
  const isnadHits = (sample.match(ISNAD_MARKERS) || []).length;
  const masalaHits = (sample.match(MASALA_SPLIT) || []).length;

  return masalaHits > isnadHits ? 'masail' : 'hadith';
}

export interface ParsedMasala {
  number?: string;
  text: string;
}

/** Splits a fiqh manual into its numbered rulings. */
export function parseMasail(text: string): ParsedMasala[] {
  return text
    .split(MASALA_SPLIT)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block.length >= 40)
    .map((block) => {
      const header = block.match(MASALA_START);
      const number = header ? toWesternDigits(header[0]).replace(/\D/g, '') : undefined;
      return { number: number || undefined, text: block };
    });
}

/**
 * Parse a hadith block into components
 * Expects text with patterns like:
 * - "عَنْ فُلَانٍ عَنْ فُلَانٍ... [MATN]"
 * - "It is related from X from Y... [MATN]"
 * - "Chain: ... Grade: sahih"
 */
export function parseHadith(text: string): ParsedHadith {
  const trimmed = text.trim();

  // Try to extract hadith number (e.g., "Hadith 123" or "#123" or "۱۲۳")
  const numberMatch = trimmed.match(
    /(?:Hadith|رقم|#)\s*[ﭐ-﷿؀-ۿ0-9]+/i,
  );
  const hadithNumber = numberMatch ? numberMatch[0].replace(/[^\d]/g, '') : undefined;

  // Extract grading (sahih, hasan, da'if, mawthuq, etc.)
  const gradingMatch = trimmed.match(
    /(?:Grade|Grading|صحيح|حسن|ضعيف|موثق):\s*([^,.\n]+)/i,
  );
  const grading = gradingMatch ? gradingMatch[1].trim() : undefined;

  // Try to separate isnad from matn
  const { isnad, matn } = separateIsnadMatn(trimmed);

  // Extract narrator names from isnad
  const narrators = extractNarrators(isnad);

  return {
    isnadRaw: isnad,
    narrators,
    matn,
    grading,
    hadithNumber,
  };
}

function separateIsnadMatn(text: string): { isnad: string; matn: string } {
  // Arabic isnad starts with عَنْ, عن, أخبرنا, حدثنا
  const arabicIsnadPattern = /^[\s]*(?:عَنْ|عن|أخبرنا|حدثنا|قال|رضي).*?(?=[\n]|الله)/;

  // English/Transliteration isnad patterns
  const englishIsnadPattern = /^[\s]*(?:It is related|related|narrated|from|through).*?(?=:|\n|that)/i;

  let isnad = '';
  let matn = text;

  const arabicMatch = text.match(arabicIsnadPattern);
  if (arabicMatch) {
    isnad = arabicMatch[0];
    matn = text.substring(arabicMatch[0].length).trim();
  } else {
    const englishMatch = text.match(englishIsnadPattern);
    if (englishMatch) {
      isnad = englishMatch[0];
      matn = text.substring(englishMatch[0].length).trim();
    }
  }

  // Clean up isnad
  isnad = isnad
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If still looks like it has both, try colon split
  if (!isnad && matn.includes(':')) {
    const [first, ...rest] = matn.split(':');
    if (first.split(/\s+/).length < 30) {
      // First part is likely isnad
      isnad = first.trim();
      matn = rest.join(':').trim();
    }
  }

  return { isnad, matn };
}

function extractNarrators(isnad: string): string[] {
  if (!isnad) return [];

  const narrators: string[] = [];

  // Split by common connectors
  const parts = isnad.split(/(?:عَنْ|عن|from|through|via|\s-\s)/gi);

  for (const part of parts) {
    const cleaned = part.trim();

    // Skip connectors and empty parts
    if (
      cleaned.length < 3 ||
      cleaned.match(/^(?:it|is|related|narrated|said|that)$/i)
    ) {
      continue;
    }

    // Take first few words (name typically doesn't exceed 3-4 words)
    const nameWords = cleaned.split(/[,\s]+/).slice(0, 4);
    const name = nameWords.join(' ').trim();

    if (name && !narrators.includes(name)) {
      narrators.push(name);
    }
  }

  return narrators;
}

/**
 * Normalize narrator names for consistent matching
 * Handles: abbreviations, transliteration variants, kunya/laqab
 */
export function normalizeNarratorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[،]/g, '') // Remove Arabic comma
    .replace(/\b(?:abu|umm|abd|a\.)/gi, '') // Remove common prefixes
    .trim();
}

/**
 * Group related hadiths by their narrator chain
 */
export function groupByNarratorChain(hadiths: ParsedHadith[]): Map<string, ParsedHadith[]> {
  const grouped = new Map<string, ParsedHadith[]>();

  for (const hadith of hadiths) {
    // Use first narrator as grouping key (more specific than just first narrator)
    const key =
      hadith.narrators.length > 0
        ? normalizeNarratorName(hadith.narrators[0])
        : 'unknown';

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)!.push(hadith);
  }

  return grouped;
}
