export interface Narrator {
  id: string;
  canonicalName: string;
  nameVariants: string[];
  era?: string;
  bioSummary?: string;
}

export interface HadithGrading {
  /** Verbatim verdict as given (often Arabic: صحيح, ضعيف, موثق, مرسل…). */
  grade: string;
  /** The scholar who issued it — they frequently disagree on the same narration. */
  gradedBy?: string;
  /** Work the verdict is cited from, e.g. "Mir'at al-'Uqul (1/25)". */
  gradingSource?: string;
}

export interface Hadith {
  id: string;
  bookId: string;
  chapterId: string;
  hadithNumber: string;
  isnadRaw: string;
  matnArabic: string;
  matnTranslation?: string;
  narrators: Narrator[];
  gradings?: HadithGrading[];
  language?: 'ar' | 'en' | 'ur';
  sourceUrl?: string;
  pageNumber?: number;
  createdAt: Date;
}

export interface HadithChunk {
  id: string;
  hadithId: string;
  bookId: string;
  chapterId: string;
  chunkText: string;
  embedding?: number[];
  chunkIndex: number;
  totalChunks: number;
  createdAt: Date;
}

/**
 * Narration collections carry an isnad; fiqh manuals are numbered rulings;
 * encyclopedia entries are secondary sources and must not be cited as narrations.
 */
export type DocType = 'hadith' | 'masail' | 'encyclopedia';

export interface Book {
  id: string;
  title: string;
  author?: string;
  translator?: string;
  language: 'ar' | 'en' | 'ur';
  sourceFileId?: string;
  sourceUrl?: string;
  /** Stable upstream id, so a re-run updates instead of duplicating. */
  externalId?: string;
  totalHadiths: number;
  docType: DocType;
  createdAt: Date;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  /** Parent grouping the chapter sits under (thaqalayn's "category"). */
  category?: string;
  orderIndex: number;
  createdAt: Date;
}

export interface RetrievalResult {
  hadithId: string;
  bookId: string;
  bookTitle: string;
  docType: DocType;
  chapterTitle: string;
  hadithNumber: string;
  chunkText: string;
  relevanceScore: number;
  narrators: Narrator[];
  gradings?: HadithGrading[];
  matnArabic: string;
  matnTranslation?: string;
  sourceUrl?: string;
}

export interface SearchFilters {
  docType?: DocType;
  bookIds?: string[];
}

export interface EmbeddingRequest {
  text: string;
  modelId?: string;
}

export interface TextExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkerConfig {
  minChunkLength?: number;
  maxChunkLength?: number;
  overlapTokens?: number;
  sentenceBoundary?: boolean;
}
