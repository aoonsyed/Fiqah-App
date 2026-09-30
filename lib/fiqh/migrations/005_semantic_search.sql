-- Semantic + precise keyword search for fiqh questions.
-- Safe to re-run. Embeddings are filled by: npm run fiqh:embed
--
-- Why: 004's search_fiqh matched any question containing any 3+ letter query
-- word ("what", "the", "can") and ranked by whole-string trigram similarity,
-- so phrasing ("Is it permissible to…") outranked meaning. About half the
-- corpus is Persian/Arabic, which English full-text search can't reach from
-- an English or Urdu query at all. Multilingual embeddings cover both.

CREATE EXTENSION IF NOT EXISTS vector;

-- Must match EMBEDDING_DIMENSIONS in lib/rag/embedder.ts.
ALTER TABLE fiqh_questions ADD COLUMN IF NOT EXISTS embedding vector(384);

-- ivfflat on pgvector < 0.5.0, which has no HNSW support.
DO $$
BEGIN
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_fiqh_questions_embedding
      ON fiqh_questions USING hnsw (embedding vector_cosine_ops);
  EXCEPTION WHEN undefined_object OR feature_not_supported THEN
    RAISE NOTICE 'HNSW unavailable on this pgvector build; using ivfflat instead';
    CREATE INDEX IF NOT EXISTS idx_fiqh_questions_embedding
      ON fiqh_questions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 200);
  END;
END $$;

-- Editing a question's text makes its vector stale; clear it so the next
-- `npm run fiqh:embed` picks the row up again.
CREATE OR REPLACE FUNCTION fiqh_questions_search_vectors()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_en :=
    setweight(to_tsvector('english', coalesce(NEW.question_en, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B');
  NEW.search_ar :=
    setweight(to_tsvector('arabic', coalesce(NEW.question_ar, '')), 'A');
  NEW.updated_at := NOW();
  IF TG_OP = 'UPDATE' AND NEW.question_en IS DISTINCT FROM OLD.question_en THEN
    NEW.embedding := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------ semantic RPC

DROP FUNCTION IF EXISTS match_fiqh_questions(vector, int, uuid, uuid);

CREATE FUNCTION match_fiqh_questions(
  query_embedding vector(384),
  match_count int DEFAULT 20,
  filter_category_id uuid DEFAULT NULL,
  filter_marja_id uuid DEFAULT NULL
)
RETURNS TABLE (
  question_id uuid,
  question_slug text,
  question_en text,
  question_ar text,
  subcategory_slug text,
  category_slug text,
  rank real,
  top_ruling_type text,
  marja_count bigint
)
LANGUAGE sql
STABLE
-- The HNSW default (40) caps how many rows a filtered query can return.
SET hnsw.ef_search = 100
AS $$
  WITH nearest AS (
    SELECT fq.id, fq.embedding <=> query_embedding AS distance
    FROM fiqh_questions fq
    JOIN fiqh_subcategories fs ON fs.id = fq.subcategory_id
    WHERE fq.embedding IS NOT NULL
      AND (filter_category_id IS NULL OR fs.category_id = filter_category_id)
      AND (filter_marja_id IS NULL OR EXISTS (
        SELECT 1 FROM fatwas f WHERE f.question_id = fq.id AND f.marja_id = filter_marja_id
      ))
    ORDER BY fq.embedding <=> query_embedding
    LIMIT match_count
  )
  SELECT
    fq.id,
    fq.slug,
    fq.question_en,
    fq.question_ar,
    fs.slug,
    fc.slug,
    (1 - n.distance)::real,
    (SELECT f.ruling_type FROM fatwas f WHERE f.question_id = fq.id ORDER BY f.created_at LIMIT 1),
    (SELECT count(*) FROM fatwas f WHERE f.question_id = fq.id)
  FROM nearest n
  JOIN fiqh_questions fq ON fq.id = n.id
  JOIN fiqh_subcategories fs ON fs.id = fq.subcategory_id
  JOIN fiqh_categories fc ON fc.id = fs.category_id
  ORDER BY n.distance;
$$;

-- ------------------------------------------------------------- keyword RPC
-- Stopwords are dropped and terms stemmed by plainto_tsquery; the terms are
-- then OR-ed so a question matching most of them ranks above one matching a
-- single word, while one unmatched word no longer zeroes out the result.

DROP FUNCTION IF EXISTS search_fiqh(text, int, uuid, uuid);

CREATE FUNCTION search_fiqh(
  query_text text,
  match_count int DEFAULT 20,
  filter_category_id uuid DEFAULT NULL,
  filter_marja_id uuid DEFAULT NULL
)
RETURNS TABLE (
  question_id uuid,
  question_slug text,
  question_en text,
  question_ar text,
  subcategory_slug text,
  category_slug text,
  rank real,
  top_ruling_type text,
  marja_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT NULLIF(replace(plainto_tsquery('english', query_text)::text, ' & ', ' | '), '')::tsquery AS tsq
  ),
  matched AS (
    SELECT fq.id, ts_rank(fq.search_en, q.tsq, 1) AS r
    FROM fiqh_questions fq
    JOIN fiqh_subcategories fs ON fs.id = fq.subcategory_id
    CROSS JOIN q
    WHERE fq.search_en @@ q.tsq
      AND (filter_category_id IS NULL OR fs.category_id = filter_category_id)
      AND (filter_marja_id IS NULL OR EXISTS (
        SELECT 1 FROM fatwas f WHERE f.question_id = fq.id AND f.marja_id = filter_marja_id
      ))
    ORDER BY r DESC
    LIMIT match_count
  )
  SELECT
    fq.id,
    fq.slug,
    fq.question_en,
    fq.question_ar,
    fs.slug,
    fc.slug,
    m.r::real,
    (SELECT f.ruling_type FROM fatwas f WHERE f.question_id = fq.id ORDER BY f.created_at LIMIT 1),
    (SELECT count(*) FROM fatwas f WHERE f.question_id = fq.id)
  FROM matched m
  JOIN fiqh_questions fq ON fq.id = m.id
  JOIN fiqh_subcategories fs ON fs.id = fq.subcategory_id
  JOIN fiqh_categories fc ON fc.id = fs.category_id
  ORDER BY m.r DESC, fq.question_en;
$$;
