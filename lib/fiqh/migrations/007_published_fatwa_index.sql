-- Published rulings (imported from a marja's own works) are the rows whose first
-- evidence ref is a URL. Public counts filter on exactly this expression, which
-- otherwise means a full scan of every fatwa, placeholders included.
CREATE INDEX IF NOT EXISTS fatwas_published_marja_idx
  ON fatwas (marja_id)
  WHERE (evidence_refs -> 0 ->> 'type') = 'url';
