-- Broader fiqh search: word tokens, trigram similarity, fatwa text.
-- Safe to re-run (replaces search_fiqh).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
    SELECT trim(query_text) AS raw, plainto_tsquery('english', query_text) AS tsq
  ),
  words AS (
    SELECT DISTINCT x AS word
    FROM unnest(string_to_array(lower(trim(query_text)), ' ')) AS x
    WHERE length(x) > 2
  ),
  matched AS (
    SELECT
      fq.id,
      fq.slug,
      fq.question_en,
      fq.question_ar,
      fs.slug AS sub_slug,
      fc.slug AS cat_slug,
      GREATEST(
        COALESCE(ts_rank(fq.search_en, (SELECT tsq FROM q)), 0),
        COALESCE(similarity(lower(fq.question_en), lower((SELECT raw FROM q))), 0) * 0.85,
        (
          SELECT COALESCE(max(similarity(lower(f.answer_en), lower((SELECT raw FROM q)))), 0) * 0.65
          FROM fatwas f WHERE f.question_id = fq.id
        )
      ) AS r
    FROM fiqh_questions fq
    JOIN fiqh_subcategories fs ON fs.id = fq.subcategory_id
    JOIN fiqh_categories fc ON fc.id = fs.category_id
    CROSS JOIN q
    WHERE fq.search_en @@ q.tsq
       OR fq.question_en ILIKE '%' || q.raw || '%'
       OR q.raw = ANY (fq.keywords)
       OR similarity(lower(fq.question_en), lower(q.raw)) > 0.12
       OR EXISTS (
         SELECT 1 FROM words w
         WHERE fq.question_en ILIKE '%' || w.word || '%'
       )
       OR EXISTS (
         SELECT 1 FROM fatwas f
         JOIN words w ON f.answer_en ILIKE '%' || w.word || '%'
         WHERE f.question_id = fq.id
       )
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
  WHERE m.r > 0
    AND (filter_category_id IS NULL OR EXISTS (
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
