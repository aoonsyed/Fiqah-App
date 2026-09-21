# Shia Fiqh Platform

**Fiqh-only** Next.js app: comparative marja corpus on Supabase. Hadith RAG, qibla, and prayer times are removed from the product surface.

## Setup

1. `.env.local` — Supabase URL, service role, anon key, `GEMINI_API_KEY` (for `/chat`).
2. Add `SUPABASE_DB_PASSWORD` (or `SUPABASE_DB_URL`) to `.env.local` from Supabase → Settings → Database.
3. `npm run fiqh:migrate` then `npm run fiqh:import -- --wipe` — **real** data from Khamenei (English EPUB) + Sistani (sistani.org Urdu masail).

Or synthetic placeholder corpus: `npm run fiqh:seed -- sample`
4. `npm run db:probe`
5. `npm run dev`

## Routes

| Path | Purpose |
|------|---------|
| `/` | Home hub |
| `/chat` | Fiqh Q&A (public, rate-limited) |
| `/search` | Question search |
| `/topics/[slug]` | Domain browse |
| `/masail/[slug]` | Question + fatwas |
| `/compare/[slug]` | Marja comparison |
| `/principles` | Usul entries |

## Scripts

- `npm run fiqh:seed -- sample|medium|full [--wipe]`
- `npm run fiqh:seed-maraji` — adds the other 8 maraji (comparative fatwas on Khamenei masail + medium topic corpus each)
- `npm run fiqh:expand` — incremental real data (Sistani EN, Makarem)
- `npm run fiqh:expand-existing` — **more data for current maraji only** (Sistani EN/UR/AR/FA, Khamenei EPUB, Makarem EN+FA; `--deep` / `--extend-generated`)
- `npm run fiqh:seed-mass` — push toward **50k–150k fatwas** (comparative fill + full taxonomy `corpus-full-*` × 11 maraji)
- `npm run fiqh:seed-aggressive` — mass seed + deep web expand + `db:probe` (long run)
- `npm run fiqh:migrate` — applies all `lib/fiqh/migrations/*.sql` (run after pull for `004_search_robust.sql` — better typo / broken-English search)
- `npm run db:probe`
- `GET /api/fiqh/sources` — marja official URLs + planned import candidates (`lib/fiqh/maraji-sources.ts`)

## Search & compare UX

- `/search?q=…&compareTop=1` returns the best match plus all marja fatwas on that question.
- `/chat` shows a marja card grid for the top corpus hit (up to 8 cards) alongside the AI summary.
- Query expansion lives in `lib/fiqh/query-expand.ts` (synonyms: salat/salah, musik/music, kums/khums, etc.).

## Optional: remove old hadith data

If your Supabase project still has Nūr hadith tables (`books`, `hadiths`, `hadith_chunks`, …), drop them in SQL when you no longer need them. The app does not use them.
