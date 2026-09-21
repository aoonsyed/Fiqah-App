import type { RulingType } from './types';

/** Heuristic hukm tag from published risalah wording (English/Urdu keywords). */
export function inferRulingType(text: string): RulingType {
  const t = text.toLowerCase();

  if (/\b(haram|forbidden|prohibited|not permissible|impermissible)\b/.test(t)) return 'haram';
  if (/\b(wajib|obligatory|compulsory|must\b|farz|farḍ)\b/.test(t)) return 'wajib';
  if (/\b(mustahab|recommended|better to|afdhal|sunna)\b/.test(t)) return 'mustahab';
  if (/\b(makruh|disliked|discouraged|khilaf)\b/.test(t)) return 'makruh';
  if (/\b(mubah|permissible|allowed|no problem|no issue|permitted)\b/.test(t)) return 'mubah';
  if (/\b(if |when |unless |depends|conditional|provided that)\b/.test(t)) return 'conditional';
  if (/\b(differ|dispute|scholars|views vary|ikhtilaf)\b/.test(t)) return 'disputed';

  return 'informational';
}
