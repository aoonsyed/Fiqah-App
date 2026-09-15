# Islamic Books RAG - Implementation Status

## Phase 0: Setup ✅ COMPLETE

### What Was Done

1. **Unified Project Structure**
   - Consolidated frontend (Next.js) as the main application
   - Created unified package.json with all dependencies
   - Set up root-level TypeScript and Next.js configuration
   - Ready to remove `/backend` and `/frontend` folders once fully tested

2. **Core RAG Library** (`/lib/rag/`)
   - `types.ts` - TypeScript interfaces for Hadith, Book, Chapter, Embedding, etc.
   - `embedder.ts` - Embedding generation (Claude/Anthropic API)
   - `extractor.ts` - Text extraction from PDF, DOCX, TXT files
   - `chunker.ts` - Semantic text chunking with sentence alignment
   - `parser.ts` - Hadith structure parsing (isnad/matn extraction, narrator parsing)
   - `db.ts` - Supabase PostgreSQL + pgvector integration
   - `engine.ts` - RAG orchestration with Claude for generation + citation handling

3. **API Routes** (`/app/api/`)
   - `POST /api/chat` - RAG chat endpoint with streaming support
   - `GET /api/qibla` - Qibla direction calculation (great-circle bearing)
   - `GET /api/prayer-times` - Aladhan API integration (Shia Jafari method)
   - `GET /api/hadith/daily` - Daily hadith cron endpoint
   - `POST /api/admin/ingest` - Hadith book ingestion pipeline
   - `GET /api/health` - Health check for Supabase connection

4. **Configuration Files**
   - `.env.local` - Template with Supabase, Claude, and feature flags
   - `next.config.ts` - Next.js 15 configuration with proper webpack setup
   - `tsconfig.json` - TypeScript paths for clean imports
   - `.gitignore` - Updated for unified structure

5. **Frontend API Client** (`/lib/api.ts`)
   - Chat, Qibla, prayer times, daily hadith endpoints
   - Supabase client initialization
   - Error handling and types

### Technology Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Supabase PostgreSQL + pgvector
- **Auth**: Supabase Auth (ready for integration)
- **LLM**: Anthropic Claude 3.5 Sonnet
- **Text Processing**: pdf-parse, mammoth (DOCX), pdf-parse
- **Vector Store**: pgvector (native PostgreSQL)
- **Prayer Times API**: Aladhan (Jafari/Shia method)

## Phase 1: Ingestion Pipeline (Next)

### What Needs to Be Done

1. **Database Setup**
   ```sql
   -- Create tables in Supabase PostgreSQL
   CREATE TABLE books (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     author TEXT,
     language VARCHAR(3) DEFAULT 'ar',
     source_file_id TEXT,
     total_hadiths INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE chapters (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     book_id UUID NOT NULL REFERENCES books(id),
     title TEXT NOT NULL,
     order_index INTEGER,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE hadiths (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     book_id UUID NOT NULL REFERENCES books(id),
     chapter_id UUID REFERENCES chapters(id),
     hadith_number TEXT,
     isnad_raw TEXT,
     matn_arabic TEXT NOT NULL,
     matn_translation TEXT,
     narrators JSONB,
     grading JSONB,
     page_number INTEGER,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE hadith_chunks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     hadith_id UUID NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
     book_id UUID NOT NULL REFERENCES books(id),
     chapter_id UUID REFERENCES chapters(id),
     chunk_text TEXT NOT NULL,
     embedding vector(1536),
     chunk_index INTEGER,
     total_chunks INTEGER,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Enable pgvector extension
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Create index for vector similarity search
   CREATE INDEX ON hadith_chunks USING ivfflat (embedding vector_cosine_ops);

   -- Create stored function for similarity search
   CREATE OR REPLACE FUNCTION search_hadiths (
     query_embedding vector(1536),
     similarity_threshold float,
     match_count int
   )
   RETURNS TABLE (
     hadith_id UUID,
     book_title TEXT,
     chapter_title TEXT,
     hadith_number TEXT,
     chunk_text TEXT,
     similarity float,
     narrators JSONB,
     grading JSONB,
     matn_translation TEXT
   ) AS $$
   BEGIN
     RETURN QUERY
     SELECT
       h.id,
       b.title,
       c.title,
       h.hadith_number,
       hc.chunk_text,
       1 - (hc.embedding <=> query_embedding) as similarity,
       h.narrators,
       h.grading,
       h.matn_translation
     FROM hadith_chunks hc
     JOIN hadiths h ON hc.hadith_id = h.id
     JOIN books b ON h.book_id = b.id
     LEFT JOIN chapters c ON h.chapter_id = c.id
     WHERE (1 - (hc.embedding <=> query_embedding)) > similarity_threshold
     ORDER BY similarity DESC
     LIMIT match_count;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Test Data Ingestion**
   - Use a single book (e.g., sample translated hadith collection)
   - Verify parser correctly extracts hadith structure
   - Test embedding generation and storage
   - Validate similarity search works

3. **Ingestion Script**
   - Create `/scripts/ingest.ts` for batch processing
   - Handle large files (>100MB PDFs)
   - Progress tracking
   - Error recovery

### Success Criteria
- [ ] Supabase PostgreSQL configured with pgvector
- [ ] All tables created and indexed
- [ ] Single test book ingested (10+ hadiths)
- [ ] Vector search returns relevant results
- [ ] Chat endpoint retrieves and cites sources correctly

## Next Steps

1. **Set up Supabase project**
   - Create account at supabase.com
   - Initialize PostgreSQL database
   - Enable pgvector extension
   - Create tables and stored functions

2. **Add API keys to `.env.local`**
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Test Phase 1**
   ```bash
   npm run dev
   # Test endpoints:
   # - GET /api/health
   # - GET /api/qibla?lat=31.5&lng=74.3 (Lahore)
   # - GET /api/prayer-times?lat=31.5&lng=74.3
   ```

## File Structure

```
islamic_books_rag/
├── app/                          # Next.js App Router
│   ├── api/                       # API routes
│   │   ├── chat/route.ts
│   │   ├── qibla/route.ts
│   │   ├── prayer-times/route.ts
│   │   ├── hadith/daily/route.ts
│   │   ├── admin/ingest/route.ts
│   │   └── health/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── rag/                       # RAG engine
│   │   ├── types.ts               # Type definitions
│   │   ├── embedder.ts            # Embedding generation
│   │   ├── extractor.ts           # PDF/DOCX text extraction
│   │   ├── chunker.ts             # Text chunking
│   │   ├── parser.ts              # Hadith parsing
│   │   ├── db.ts                  # Supabase integration
│   │   ├── engine.ts              # RAG orchestration
│   │   └── index.ts               # Exports
│   └── api.ts                     # Frontend API client
├── src/                           # Frontend (from old frontend/)
│   ├── app/                       # Keep existing frontend app structure
│   ├── components/
│   └── lib/
├── scripts/
│   └── ingest.ts                  # (Phase 1) Ingestion script
├── books/                         # Local book storage (git-ignored)
├── .env.local                     # Configuration (git-ignored)
├── next.config.ts                 # Next.js config
├── tsconfig.json                  # TypeScript config
└── package.json                   # Dependencies

# To be deleted after testing:
├── backend/                       # Old FastAPI backend
├── frontend/                      # Old frontend folder
├── *.py                           # Old Python scripts
└── __pycache__/                   # Python cache
```

## Notes for Next Developer

- **Don't over-engineer**: Keep code compact and purposeful. Remove any redundant logic.
- **Test early**: Validate hadith parsing with a small sample before scaling.
- **Monitor costs**: Embedding generation and Claude API calls add up—track usage.
- **Arabic handling**: Ensure diacritics are preserved in storage and display.
- **Authenticity**: Never let the system auto-grade hadiths—only display grades from source books.
