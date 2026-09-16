# Nūr — Shia Islamic Knowledge Base

A retrieval-grounded question-answering app over a hadith and fiqh corpus. Ask a question in plain
language; answers are composed **only** from narrations retrieved out of the database, and every
claim carries a citation back to the book, chapter and narration it came from.

Also includes a Qibla compass and Jafari-method prayer times.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase Postgres + pgvector ·
local embeddings via Transformers.js · Claude for answer generation.

---

## Corpus

Built by importing from structured sources rather than scanned PDFs — the text is Unicode, the
chapter structure is real, and gradings come from the publishers.

*Snapshot, 16 September 2026:* **35 books · 68,379 narrations · 109,154 embedded chunks · 7,457 chapters**

| Source | Content | Language |
|---|---|---|
| [thaqalayn.net](https://thaqalayn.net) (REST API) | Shia collections — al-Kāfi (8 vols), al-Amālī, al-Khiṣāl, al-Tawḥīd, Kāmil al-Ziyārāt, ʿUyūn akhbār al-Riḍā… | Arabic + English |
| thaqalayn search index | Books the REST API doesn't serve — **Nahj al-Balāgha**, Man Lā Yaḥḍuruh al-Faqīh (5 vols), Tahdhīb al-Aḥkām (4 vols), Kamāl al-Dīn, Risālat al-Ḥuqūq | Arabic + English |
| [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | Sihah Sitta — Bukhārī, Muslim, Abū Dāwūd, Tirmidhī, Nasāʾī, Ibn Mājah, with per-scholar gradings | Arabic + English |
| [sistani.org](https://www.sistani.org/urdu/book/61/) | *Tauzeeh ul Masail* — 2,968 numbered rulings | Urdu |
| [leader.ir](https://www.leader.ir/en/book/32/Practical-Laws-of-Islam) | Khamenei, *Practical Laws of Islam* — 2,097 Q&As, from the official EPUB | English |

All Four Books of the Shia canon are present, alongside the six canonical Sunni collections.

---

## How it works

**Ingestion** ([`lib/rag/importer.ts`](lib/rag/importer.ts)) — each source adapter under
[`scripts/sources/`](scripts/sources/) fetches and parses records; the shared core creates books and
chapters, inserts narrations, splits text into sentence-aligned chunks (~500 tokens, measured with
tiktoken), embeds them and writes vectors. Arabic and its translation are embedded *together* per
chunk, so a question in either language retrieves the narration.

**Embeddings** ([`lib/rag/embedder.ts`](lib/rag/embedder.ts)) — `Xenova/multilingual-e5-small`
running locally through Transformers.js. 384 dimensions, no API key, no per-token cost. e5 is
asymmetric, so stored text is prefixed `passage:` and searches `query:` — mixing these up
measurably degrades retrieval, which is why they're separate functions. Weights (~130 MB) download
once to `.cache/models`.

**Retrieval + generation** ([`lib/rag/engine.ts`](lib/rag/engine.ts)) — the question is embedded and
matched by cosine similarity through the `search_hadiths` Postgres function (HNSW index), taking the
top 10 above a 0.3 threshold. Those narrations, with translations and gradings, are passed to
`claude-3-5-sonnet` under a system prompt that forbids outside knowledge, requires a
`[[citation:N]]` marker on every substantive claim, and requires disagreeing sources to be reported
separately rather than blended. Citations are parsed back out and resolved to source records.

---

## Setup

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

### 2. Environment

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>     # server-only; bypasses RLS
ANTHROPIC_API_KEY=<key from console.anthropic.com>
CRON_SECRET=<random string>                       # guards the daily-hadith cron
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key (or `sb_secret_…`). An anon key there
connects fine but every write fails with `new row violates row-level security policy`, so the app
decodes the role at first use and refuses with a clear message instead.

### 3. Database

Run [`lib/rag/schema.sql`](lib/rag/schema.sql) in the Supabase SQL editor. It's idempotent — safe on
a fresh database or an existing one — and creates six tables, the HNSW vector index (falling back to
ivfflat on pgvector < 0.5) and the `search_hadiths` function.

### 4. Import a corpus

```bash
npm run import -- --list                    # show every available book
npm run import -- all --dry-run             # parse everything, write nothing
npm run import -- thaqalayn                 # one source
npm run import -- sunnah --book sunnah-bukhari
npm run import -- all                       # everything
```

Sources: `thaqalayn`, `thaqalayn-index`, `sunnah`, `nahj`, `sistani`, `khamenei`.

Embedding runs at roughly **2 chunks/sec** on a typical CPU, so a full import is measured in hours.
It's built for that:

- **Resumable** — completed books are skipped. An interrupted book keeps the narrations it already
  wrote and embeds only what's missing, so a crash at 80% costs minutes, not hours.
- **Single-instance** — a `.import.lock` file stops a second run from starting. Two concurrent runs
  corrupt each other, each treating the other's in-progress book as a crashed import and deleting it.
- **Patient retries** — statement timeouts and network blips retry with backoff up to 7 attempts.

### 5. Run

```bash
npm run dev          # http://localhost:3000
npm run type-check
npm run build
```

---

## Routes

| Route | Purpose |
|---|---|
| `POST /api/chat` | RAG answer with citations; `stream: true` for token streaming. 10 req/min per IP |
| `GET /api/search` | Keyword search over narration text. 30 req/min per IP |
| `GET /api/stats` | Public corpus counts — no user data |
| `GET /api/qibla` | Great-circle bearing to the Kaaba |
| `GET /api/prayer-times` | Aladhan, Jafari method (`method=0`, `midnightMode=1`) |
| `GET /api/health` | Database connectivity |
| `POST /api/admin/ingest` | Upload a PDF/DOCX/TXT — admin only |
| `GET /api/admin/stats` | Dashboard figures — admin only |
| `GET /api/hadith/daily` | Cron target, 06:00 UTC (see limitations) |

Admin access is an email allowlist in [`lib/admin-auth.ts`](lib/admin-auth.ts), verified server-side
against the caller's Supabase token in [`lib/admin-auth-server.ts`](lib/admin-auth-server.ts).

Uploaded files are checked before indexing: if fewer than 35% of extracted characters are letters,
the upload is rejected. Urdu PDFs are typically typeset in fonts with no `ToUnicode` map, so their
text layer extracts as glyph codes — indexing that produces a corpus that looks populated and can
never be searched.

---

## Known limitations

- **Local embeddings don't work on Vercel as-is.** The model writes to `.cache/models`, but a
  serverless filesystem is read-only apart from `/tmp`, which is wiped between cold starts. Set
  `TRANSFORMERS_CACHE=/tmp/models` and accept slow cold starts, switch to a hosted embedding API
  (different dimensions — needs re-embedding), or deploy somewhere long-lived.
- **Books from the thaqalayn search index have lowercase English.** That index stores a
  search-normalised `textEn` with no capitals. Arabic is fully vocalised and unaffected. Re-import
  with `--force` if the REST API ever starts serving those books.
- Those same books cite the **book page** rather than a per-narration permalink, which the index
  doesn't expose.
- **`/api/hadith/daily` is a stub** — it returns `hadith: null` and selects nothing.
- **Isnad extraction is uneven.** The chain parser matches 80–97% of narrations in the Saduq/Amālī
  books but 0–3% in al-Kāfi, whose chains use forms the regex doesn't cover.
- **RLS is enabled with no policies.** Everything works because all database access goes through
  server routes using the service-role key. Browser-side reads with the anon key return nothing, so
  saved conversations would need policies on `conversations` and `messages` first.
- **Rate limiting is in-memory**, so limits are per-instance and reset on deploy.
- `maxDuration = 300` on the ingest route requires a Vercel Pro plan; Hobby caps at 60s.

---

## Project structure

```
app/
  api/                  route handlers (chat, search, qibla, prayer-times, admin, stats)
  components/           UI — chat, citations, Qibla compass, prayer timeline, charts
  admin/                upload + analytics dashboards (email-restricted)
lib/
  rag/
    importer.ts         shared ingestion core: chapters, batching, embedding, resume, locking
    embedder.ts         local Transformers.js embeddings (e5-small, 384d)
    chunker.ts          sentence-aligned, token-budgeted chunking
    engine.ts           retrieval + Claude generation + citation extraction
    db.ts               Supabase data access, camelCase <-> snake_case mapping
    parser.ts           isnad/matn splitting, numbered-ruling (masail) parsing
    extractor.ts        PDF/DOCX/TXT text extraction + readability check
    schema.sql          full schema, idempotent
  supabase-server.ts    service-role client, validated lazily
  errors.ts             readable messages from Supabase's plain-object errors
scripts/
  import.ts             import CLI
  sources/              one adapter per source
```

`IMPLEMENTATION.md`, `QUICKSTART.md`, `PROJECT_STATUS.md` and the `PHASE*.md` files document earlier
iterations and are superseded by this README.

---

## Accuracy

Retrieval is grounded and citations are resolved to real records, but the answer text is generated.
For anything carrying religious or legal weight, read the cited narration itself — every citation
opens the full Arabic, its translation, the chain and the gradings, and links to the source where
available.

Where scholars disagree on a narration's grading, all verdicts are stored and shown. Thaqalayn
supplies up to three (Majlisi, Behbudi, Mohseni) and the Sunni collections up to four (Albani,
Shakir, Zubair Ali Zai, Abu Ghuddah); recording one would silently pick a winner in a live dispute.
