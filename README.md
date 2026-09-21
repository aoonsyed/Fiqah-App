# Shia Fiqh Platform

Comparative Shia fiqh on **Next.js 15 + Supabase**: ten maraji, structured masail, search, side-by-side compare, and Gemini-grounded Q&A over fatwa excerpts.

**Not included:** hadith libraries, isnad RAG, qibla, or prayer times.

## Quick start

```bash
npm install
# .env.local → Supabase + GEMINI_API_KEY
# Supabase SQL → lib/fiqh/migrations/003_fiqh_corpus.sql
npm run fiqh:seed -- sample
npm run dev
```

See **[FIQH_PLATFORM.md](./FIQH_PLATFORM.md)** for routes, API, and scaling the seed to 150k+ fatwas.

## Stack

Next.js · TypeScript · Tailwind · Supabase Postgres · Gemini (chat answers)
