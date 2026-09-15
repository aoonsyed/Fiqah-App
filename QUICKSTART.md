# Quick Start Guide

## 5-Minute Setup

### 1. Install & Configure
```bash
npm install

# Copy and fill in your API keys
cp .env.local.example .env.local
# Edit .env.local with:
#   - NEXT_PUBLIC_SUPABASE_URL
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - SUPABASE_SERVICE_ROLE_KEY
#   - ANTHROPIC_API_KEY
```

### 2. Initialize Database (Supabase)
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy `lib/rag/schema.sql`
4. Paste into Supabase SQL Editor and run

### 3. Run Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Ingest Test Book
```bash
npm run ingest -- \
  --file=books/sample.txt \
  --title="Sample Hadith Collection"
```

### 5. Test Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is knowledge?"}'
```

---

## Project Structure

```
app/                    # Next.js App Router
├── api/                 # API routes (chat, qibla, prayer-times, etc.)
├── layout.tsx
└── page.tsx

lib/rag/                # RAG engine (reusable modules)
├── types.ts             # Type definitions
├── embedder.ts          # Embedding generation
├── extractor.ts         # PDF/DOCX extraction
├── chunker.ts           # Text chunking
├── parser.ts            # Hadith parsing
├── db.ts                # Supabase integration
├── engine.ts            # RAG orchestration
├── index.ts             # Exports
└── schema.sql           # Database schema

scripts/                # Utility scripts
└── ingest-test.ts      # Batch ingestion

books/                  # Local book storage (git-ignored)

.env.local              # Environment configuration (git-ignored)
next.config.ts          # Next.js config
tsconfig.json           # TypeScript config
package.json            # Dependencies
```

---

## Key Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm start                # Run production build
npm run lint             # Check code style
npm run type-check       # TypeScript validation
npm run ingest -- ...    # Ingest a hadith book
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | RAG chatbot |
| `/api/qibla` | GET | Qibla direction (lat/lng params) |
| `/api/prayer-times` | GET | Prayer times (lat/lng params, Jafari method) |
| `/api/hadith/daily` | GET | Daily hadith of the day |
| `/api/admin/ingest` | POST | Upload & ingest books |
| `/api/health` | GET | System health status |

---

## Documentation

- **Full Setup Guide:** `PHASE1_GUIDE.md`
- **Implementation Status:** `IMPLEMENTATION.md`
- **Original Plan:** See top of this repo for 14-section architecture plan

---

## Support

For issues or questions, check:
1. `.env.local` has all required keys
2. Supabase database tables exist (run schema.sql)
3. npm dependencies installed (`npm install`)
4. Dev server running on port 3000

---

Next: Follow `PHASE1_GUIDE.md` for detailed setup instructions.
