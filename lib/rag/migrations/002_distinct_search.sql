-- Fixes search_hadiths timing out and returning the same narration several times.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Why the old function timed out: filtering on the similarity expression and
-- joining before ORDER BY/LIMIT stopped Postgres from using the vector index,
-- so every query scanned all ~126k chunks. The index scan now runs first on
-- hadith_chunks alone, and joins/filters apply to that small candidate set.

-- Building HNSW over ~126k vectors needs more than the default work memory.
SET maintenance_work_mem = '256MB';

CREATE INDEX IF NOT EXISTS idx_hadith_chunks_embedding
  ON hadith_chunks USING hnsw (embedding vector_cosine_ops);

DROP FUNCTION IF EXISTS search_hadiths(vector, float, int);
DROP FUNCTION IF EXISTS search_hadiths(vector, float, int, text, uuid[]);

CREATE FUNCTION search_hadiths (
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  -- 'hadith' | 'masail' | NULL for both
  filter_doc_type text DEFAULT NULL,
  filter_book_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  hadith_id UUID,
  book_id UUID,
  book_title TEXT,
  doc_type TEXT,
  chapter_title TEXT,
  hadith_number TEXT,
  chunk_text TEXT,
  similarity float,
  narrators JSONB,
  grading JSONB,
  matn_arabic TEXT,
  matn_translation TEXT,
  source_url TEXT
)
LANGUAGE plpgsql
-- The candidate pool below is 300 chunks; the index must search at least that wide.
SET hnsw.ef_search = 300
AS $$
BEGIN
  RETURN QUERY
  WITH nearest AS (
    -- Must stay a bare ORDER BY distance LIMIT n, or the index is not used.
    SELECT hc.hadith_id, hc.book_id, hc.chunk_text,
           1 - (hc.embedding <=> query_embedding) AS sim
    FROM hadith_chunks hc
    ORDER BY hc.embedding <=> query_embedding
    LIMIT 300
  ),
  best AS (
    -- Long narrations are split into several chunks; keep only the best one.
    SELECT DISTINCT ON (n.hadith_id) n.*
    FROM nearest n
    ORDER BY n.hadith_id, n.sim DESC
  )
  SELECT h.id, b.id, b.title, b.doc_type, c.title, h.hadith_number,
         best.chunk_text, best.sim, h.narrators, h.grading,
         h.matn_arabic, h.matn_translation, h.source_url
  FROM best
  JOIN hadiths h ON h.id = best.hadith_id
  JOIN books b ON b.id = best.book_id
  LEFT JOIN chapters c ON c.id = h.chapter_id
  WHERE best.sim > similarity_threshold
    AND (filter_doc_type IS NULL OR b.doc_type = filter_doc_type)
    AND (filter_book_ids IS NULL OR b.id = ANY (filter_book_ids))
  ORDER BY best.sim DESC
  LIMIT match_count;
END;
$$;
