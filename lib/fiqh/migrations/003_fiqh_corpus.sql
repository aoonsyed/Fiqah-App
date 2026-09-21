-- Shia Fiqh comparative corpus (additive — does not alter hadith/RAG tables).
-- Run in Supabase SQL Editor after lib/rag/schema.sql. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- maraji

CREATE TABLE IF NOT EXISTS maraji (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  era TEXT NOT NULL DEFAULT 'contemporary'
    CHECK (era IN ('contemporary', 'classical', 'historical')),
  bio_en TEXT,
  bio_ar TEXT,
  website_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------- categories

CREATE TABLE IF NOT EXISTS fiqh_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description_en TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiqh_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES fiqh_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------- questions

CREATE TABLE IF NOT EXISTS fiqh_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES fiqh_subcategories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  question_en TEXT NOT NULL,
  question_ar TEXT,
  keywords TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'general'
    CHECK (difficulty IN ('basic', 'general', 'advanced')),
  search_en tsvector,
  search_ar tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------- fatwas

CREATE TABLE IF NOT EXISTS fatwas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES fiqh_questions(id) ON DELETE CASCADE,
  marja_id UUID NOT NULL REFERENCES maraji(id) ON DELETE CASCADE,
  ruling_type TEXT NOT NULL DEFAULT 'informational'
    CHECK (ruling_type IN (
      'wajib', 'mustahab', 'mubah', 'makruh', 'haram',
      'conditional', 'informational', 'disputed'
    )),
  answer_en TEXT NOT NULL,
  answer_ar TEXT,
  conditions_en TEXT,
  conditions_ar TEXT,
  evidence_refs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, marja_id)
);

-- -------------------------------------------------------- question links

CREATE TABLE IF NOT EXISTS fiqh_question_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_question_id UUID NOT NULL REFERENCES fiqh_questions(id) ON DELETE CASCADE,
  to_question_id UUID NOT NULL REFERENCES fiqh_questions(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'related'
    CHECK (link_type IN ('related', 'prerequisite', 'contrast', 'see_also')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_question_id, to_question_id, link_type),
  CHECK (from_question_id <> to_question_id)
);

-- ---------------------------------------------------- legal principles

CREATE TABLE IF NOT EXISTS fiqh_principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  explanation_en TEXT NOT NULL,
  explanation_ar TEXT,
  related_category_slugs TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------ seed progress (optional)

CREATE TABLE IF NOT EXISTS fiqh_seed_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  rows_maraji INTEGER DEFAULT 0,
  rows_categories INTEGER DEFAULT 0,
  rows_subcategories INTEGER DEFAULT 0,
  rows_questions INTEGER DEFAULT 0,
  rows_fatwas INTEGER DEFAULT 0,
  rows_links INTEGER DEFAULT 0,
  rows_principles INTEGER DEFAULT 0,
  notes TEXT
);

-- --------------------------------------------------------------- indexes

CREATE INDEX IF NOT EXISTS idx_fiqh_subcategories_category ON fiqh_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_fiqh_questions_subcategory ON fiqh_questions(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_fatwas_question ON fatwas(question_id);
CREATE INDEX IF NOT EXISTS idx_fatwas_marja ON fatwas(marja_id);
CREATE INDEX IF NOT EXISTS idx_fiqh_question_links_from ON fiqh_question_links(from_question_id);
CREATE INDEX IF NOT EXISTS idx_fiqh_question_links_to ON fiqh_question_links(to_question_id);

CREATE INDEX IF NOT EXISTS idx_fiqh_questions_search_en ON fiqh_questions USING GIN (search_en);
CREATE INDEX IF NOT EXISTS idx_fiqh_questions_search_ar ON fiqh_questions USING GIN (search_ar);
CREATE INDEX IF NOT EXISTS idx_fiqh_questions_question_en_trgm ON fiqh_questions USING GIN (question_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fatwas_answer_en_trgm ON fatwas USING GIN (answer_en gin_trgm_ops);

-- ---------------------------------------------------- search vector sync

CREATE OR REPLACE FUNCTION fiqh_questions_search_vectors()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_en :=
    setweight(to_tsvector('english', coalesce(NEW.question_en, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B');
  NEW.search_ar :=
    setweight(to_tsvector('arabic', coalesce(NEW.question_ar, '')), 'A');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fiqh_questions_search ON fiqh_questions;
CREATE TRIGGER trg_fiqh_questions_search
  BEFORE INSERT OR UPDATE OF question_en, question_ar, keywords ON fiqh_questions
  FOR EACH ROW EXECUTE FUNCTION fiqh_questions_search_vectors();

-- -------------------------------------------------------- search RPC

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
    SELECT plainto_tsquery('english', query_text) AS tsq,
           query_text AS raw
  ),
  matched AS (
    SELECT
      fq.id,
      fq.slug,
      fq.question_en,
      fq.question_ar,
      fs.slug AS sub_slug,
      fc.slug AS cat_slug,
      ts_rank(fq.search_en, q.tsq) AS r
    FROM fiqh_questions fq
    JOIN fiqh_subcategories fs ON fs.id = fq.subcategory_id
    JOIN fiqh_categories fc ON fc.id = fs.category_id
    CROSS JOIN q
    WHERE fq.search_en @@ q.tsq
       OR fq.question_en ILIKE '%' || q.raw || '%'
       OR q.raw = ANY (fq.keywords)
  )
  SELECT
    m.id,
    m.slug,
    m.question_en,
    m.question_ar,
    m.sub_slug,
    m.cat_slug,
    m.r::real,
    (
      SELECT f.ruling_type FROM fatwas f
      WHERE f.question_id = m.id
      ORDER BY f.created_at
      LIMIT 1
    ),
    (SELECT count(*) FROM fatwas f WHERE f.question_id = m.id)
  FROM matched m
  WHERE (filter_category_id IS NULL OR EXISTS (
    SELECT 1 FROM fiqh_subcategories fs
    WHERE fs.id = (SELECT subcategory_id FROM fiqh_questions WHERE id = m.id)
      AND fs.category_id = filter_category_id
  ))
  AND (filter_marja_id IS NULL OR EXISTS (
    SELECT 1 FROM fatwas f WHERE f.question_id = m.id AND f.marja_id = filter_marja_id
  ))
  ORDER BY m.r DESC NULLS LAST, m.question_en
  LIMIT match_count;
$$;

-- Public read for corpus tables (service role used by API; anon can read if RLS enabled later)
ALTER TABLE maraji ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiqh_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiqh_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiqh_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatwas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiqh_question_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiqh_principles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maraji_public_read ON maraji;
CREATE POLICY maraji_public_read ON maraji FOR SELECT USING (true);

DROP POLICY IF EXISTS fiqh_categories_public_read ON fiqh_categories;
CREATE POLICY fiqh_categories_public_read ON fiqh_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS fiqh_subcategories_public_read ON fiqh_subcategories;
CREATE POLICY fiqh_subcategories_public_read ON fiqh_subcategories FOR SELECT USING (true);

DROP POLICY IF EXISTS fiqh_questions_public_read ON fiqh_questions;
CREATE POLICY fiqh_questions_public_read ON fiqh_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS fatwas_public_read ON fatwas;
CREATE POLICY fatwas_public_read ON fatwas FOR SELECT USING (true);

DROP POLICY IF EXISTS fiqh_question_links_public_read ON fiqh_question_links;
CREATE POLICY fiqh_question_links_public_read ON fiqh_question_links FOR SELECT USING (true);

DROP POLICY IF EXISTS fiqh_principles_public_read ON fiqh_principles;
CREATE POLICY fiqh_principles_public_read ON fiqh_principles FOR SELECT USING (true);
