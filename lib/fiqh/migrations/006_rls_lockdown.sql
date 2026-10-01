-- fiqh_seed_runs is internal bookkeeping for the import scripts. 003 created it
-- without enabling RLS; with RLS on and no policy, only the service-role key can
-- read or write it. Idempotent — safe to re-run with npm run fiqh:migrate.
ALTER TABLE IF EXISTS fiqh_seed_runs ENABLE ROW LEVEL SECURITY;
