-- Nūr — full schema. Safe to run on a fresh database or an existing one.
-- Embeddings are 384-dim (Xenova/multilingual-e5-small, see lib/rag/embedder.ts).

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------- tables

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  translator TEXT,
  language VARCHAR(3) DEFAULT 'ar',
  source_file_id TEXT,
  source_url TEXT,
  -- Stable id from the upstream source (e.g. thaqalayn bookId); lets an
  -- interrupted import resume instead of duplicating books.
  external_id TEXT UNIQUE,
  total_hadiths INTEGER DEFAULT 0,
  doc_type TEXT NOT NULL DEFAULT 'hadith',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hadiths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id),
  hadith_number TEXT,
  isnad_raw TEXT,
  matn_arabic TEXT NOT NULL,
  matn_translation TEXT,
  narrators JSONB,
  -- Array of {grade, gradedBy, gradingSource} — a narration is commonly graded
  -- by several scholars who disagree, so one verdict per record loses the point.
  grading JSONB,
  language VARCHAR(3) DEFAULT 'ar',
  source_url TEXT,
  page_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hadith_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hadith_id UUID NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id),
  chunk_text TEXT NOT NULL,
  embedding vector(384),
  chunk_index INTEGER,
  total_chunks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  cited_hadith_ids JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------- upgrades for older DBs

-- Added when fiqh manuals (numbered masail) became a separate document type.
ALTER TABLE books ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'hadith';

-- Added when importing from structured sources (thaqalayn, sunnah, quran.com)
-- rather than uploaded files: provenance, translator credit, resumable imports.
ALTER TABLE books    ADD COLUMN IF NOT EXISTS translator  TEXT;
ALTER TABLE books    ADD COLUMN IF NOT EXISTS source_url  TEXT;
ALTER TABLE books    ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE hadiths  ADD COLUMN IF NOT EXISTS source_url  TEXT;
ALTER TABLE hadiths  ADD COLUMN IF NOT EXISTS language    VARCHAR(3) DEFAULT 'ar';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS category    TEXT;

DO $$
BEGIN
  ALTER TABLE books ADD CONSTRAINT books_external_id_key UNIQUE (external_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN
  NULL; -- already present
END $$;

-- Embeddings moved from 1536-dim (hosted API) to 384-dim (local e5 model).
-- Vectors from a different model can't be reused, so stored chunks are cleared
-- and must be re-ingested. No-op when the column is already 384.
DO $$
DECLARE
  dims integer;
BEGIN
  SELECT a.atttypmod INTO dims
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'hadith_chunks'
    AND a.attname = 'embedding'
    AND NOT a.attisdropped;

  IF dims IS NOT NULL AND dims <> 384 THEN
    RAISE NOTICE 'Resizing hadith_chunks.embedding from % to 384 dims; clearing stale vectors', dims;
    DROP INDEX IF EXISTS idx_hadith_chunks_embedding;
    TRUNCATE TABLE hadith_chunks;
    ALTER TABLE hadith_chunks ALTER COLUMN embedding TYPE vector(384);
  END IF;
END $$;

-- --------------------------------------------------------------- indexes

CREATE INDEX IF NOT EXISTS idx_hadiths_book_id ON hadiths(book_id);
CREATE INDEX IF NOT EXISTS idx_hadiths_chapter_id ON hadiths(chapter_id);
CREATE INDEX IF NOT EXISTS idx_hadith_chunks_hadith_id ON hadith_chunks(hadith_id);
CREATE INDEX IF NOT EXISTS idx_hadith_chunks_book_id ON hadith_chunks(book_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- HNSW rather than ivfflat: it builds incrementally, so it stays accurate on a
-- table that starts empty and is filled later by ingestion. Falls back to
-- ivfflat on pgvector < 0.5.0, which has no HNSW support.
DO $$
BEGIN
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_hadith_chunks_embedding
      ON hadith_chunks USING hnsw (embedding vector_cosine_ops);
  EXCEPTION WHEN undefined_object OR feature_not_supported OR syntax_error THEN
    RAISE NOTICE 'HNSW unavailable on this pgvector build; using ivfflat instead';
    CREATE INDEX IF NOT EXISTS idx_hadith_chunks_embedding
      ON hadith_chunks USING ivfflat (embedding vector_cosine_ops);
  END;
END $$;

-- -------------------------------------------------------- search function

-- Dropped rather than replaced: CREATE OR REPLACE cannot change a signature,
-- and this one changed with the embedding dimensions.
DROP FUNCTION IF EXISTS search_hadiths(vector, float, int);

CREATE FUNCTION search_hadiths (
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  hadith_id UUID,
  book_title TEXT,
  chapter_title TEXT,
  hadith_number TEXT,
  chunk_text TEXT,
  similarity float,
  narrators JSONB,
  grading JSONB,
  matn_translation TEXT,
  source_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    b.title,
    c.title,
    h.hadith_number,
    hc.chunk_text,
    1 - (hc.embedding <=> query_embedding) AS similarity,
    h.narrators,
    h.grading,
    h.matn_translation,
    h.source_url
  FROM hadith_chunks hc
  JOIN hadiths h ON hc.hadith_id = h.id
  JOIN books b ON h.book_id = b.id
  LEFT JOIN chapters c ON h.chapter_id = c.id
  WHERE hc.embedding IS NOT NULL
    AND (1 - (hc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
