import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import type { TextExtractionResult } from './types';

export async function extractTextFromPdf(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const data = await pdfParse(buffer);

    // Combine all text from all pages
    const text = data.text || '';

    return {
      text: text.trim(),
      pageCount: data.numpages,
      metadata: {
        producer: data.info?.Producer,
        creator: data.info?.Creator,
      },
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: new Uint8Array(buffer) as any });
    const text = htmlToPlainText(result.value);

    return {
      text: text.trim(),
      metadata: {
        format: 'docx',
      },
    };
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
): Promise<TextExtractionResult> {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    return extractTextFromPdf(buffer);
  } else if (ext === 'docx' || ext === 'doc') {
    return extractTextFromDocx(buffer);
  } else if (ext === 'txt') {
    return {
      text: buffer.toString('utf-8').trim(),
    };
  }

  throw new Error(`Unsupported file format: ${ext}`);
}

/**
 * Fraction of non-whitespace characters that are actual letters (Arabic/Urdu or
 * Latin). Real prose runs ~0.7+; PDFs whose fonts use a non-Unicode encoding —
 * very common for Urdu typesetting — extract as symbol soup and score near zero.
 */
export function letterRatio(text: string): number {
  let letters = 0;
  let nonSpace = 0;

  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    nonSpace++;

    const c = ch.codePointAt(0)!;
    const isArabic = (c >= 0x0600 && c <= 0x06ff) || (c >= 0xfb50 && c <= 0xfeff);
    const isLatin = (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 0xc0 && c <= 0x24f);
    if (isArabic || isLatin) letters++;
  }

  return nonSpace === 0 ? 0 : letters / nonSpace;
}

/** Below this, the extraction produced glyph codes rather than readable text. */
export const MIN_LETTER_RATIO = 0.35;

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
