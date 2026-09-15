# Phase 1: Database Setup & Ingestion Pipeline

## Overview

Phase 1 sets up the Supabase PostgreSQL database with pgvector and ingests the first hadith book to validate the entire pipeline.

**Estimated time: 2-3 hours**

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project:
   - Organization: Create new or use existing
   - Project name: `islamic-books-rag`
   - Database password: Generate secure password
   - Region: Closest to you (us-east-1 for US, eu-west-1 for EU)
   - Pricing: Free tier is fine for testing

3. Wait for project to be created (2-3 minutes)

4. Go to **Settings** → **Database** and note:
   - `NEXT_PUBLIC_SUPABASE_URL` (under "API URL")
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (under "API keys" → "anon public")
   - `SUPABASE_SERVICE_ROLE_KEY` (under "API keys" → "service_role")

---

## Step 2: Configure Environment

1. Open `.env.local` in the project root
2. Update with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Save the file

---

## Step 3: Initialize Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy contents of `lib/rag/schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or Ctrl+Enter)
6. Wait for all statements to complete (you should see green checkmarks)

**Expected output:**
```
✅ CREATE EXTENSION
✅ CREATE TABLE (books)
✅ CREATE TABLE (chapters)
✅ CREATE TABLE (hadiths)
✅ CREATE TABLE (hadith_chunks)
✅ CREATE INDEX ...
✅ CREATE FUNCTION (search_hadiths)
```

---

## Step 4: Install Dependencies

```bash
npm install
```

This installs:
- Next.js, React, TypeScript
- Supabase client
- PDF/DOCX extraction libraries
- Embedding and tokenization tools
- Anthropic SDK

---

## Step 5: Prepare Test Book

You need a test book file (PDF, DOCX, or TXT). Options:

**Option A: Use a sample from books/ folder**
```bash
ls books/
# If you have PDFs in books/khomeini/, books/sistani/, etc., use one of those
```

**Option B: Create a minimal test file**
```bash
# Create a simple test file with a few hadiths
cat > books/test_hadith.txt << 'EOF'
الحديث الأول

عَنْ الإمام علي بن أبي طالب قال: طلب العلم فريضة على كل مسلم

الحديث الثاني

عَنْ أبي عبد الله قال: من طلب العلم فقد تقرب إلى الله عز وجل

الحديث الثالث

عَنْ رسول الله صلى الله عليه وآله: العلماء ورثة الأنبياء
EOF
```

---

## Step 6: Run Ingestion Script

### First test: Small file with verbose output

```bash
npm run ingest -- \
  --file=books/test_hadith.txt \
  --title="Test Hadith Collection" \
  --author="Test Author"
```

**Expected output:**
```
📖 Ingesting: Test Hadith Collection
📁 File: books/test_hadith.txt
✍️  Author: Test Author

🔌 Testing database connection...
✅ Database connected

📄 Extracting text...
✅ Extracted 1245 characters

📚 Creating book entry...
✅ Book created: 550e8400-e29b-41d4-a716-446655440000

📖 Creating chapter...
✅ Chapter created: 550e8400-e29b-41d4-a716-446655440001

🔍 Parsing hadiths...
✅ Parsed 3 hadiths

⚙️  Processing hadiths (3 total)...
   Processed 3/3...
✅ Created 3 hadiths and 12 chunks

🧪 Testing retrieval...
✅ Retrieval working - found 0 results

✨ Ingestion complete!

📊 Summary:
  Book ID: 550e8400-e29b-41d4-a716-446655440000
  Hadiths: 3
  Chunks: 12
```

---

## Step 7: Verify Data in Supabase

1. Go to Supabase Dashboard → **Table Editor**
2. Check each table has data:

   **books**
   - Should have 1 row with your test book

   **chapters**
   - Should have 1 row for "Main Collection"

   **hadiths**
   - Should have 3 rows (one per hadith)
   - Check `matn_arabic` column has content
   - Check `narrators` column has JSON array

   **hadith_chunks**
   - Should have ~12 rows (3 hadiths × ~4 chunks each)
   - Check `chunk_text` column has content
   - Check `embedding` column has vector data (not NULL)

---

## Step 8: Test Chat Endpoint

Start the dev server:
```bash
npm run dev
```

Open another terminal and test the chat API:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is knowledge in Islam?"
  }'
```

**Expected response:**
```json
{
  "answer": "Based on the sources provided, Islamic knowledge...",
  "sources": [
    {
      "hadithId": "...",
      "bookTitle": "Test Hadith Collection",
      "chapterTitle": "Main Collection",
      "hadithNumber": "h1",
      "chunkText": "طلب العلم فريضة على كل مسلم",
      "relevanceScore": 0.75,
      "narrators": ["علي بن أبي طالب"],
      "matnTranslation": null
    }
  ],
  "citations": []
}
```

---

## Step 9: Test Other Endpoints

### Qibla Direction
```bash
# For Mecca coordinates
curl "http://localhost:3000/api/qibla?lat=31.5&lng=74.3"

# Response:
# {"bearing": 289.45, "direction": "WNW", "latitude": 31.5, "longitude": 74.3}
```

### Prayer Times (Jafari/Shia method)
```bash
curl "http://localhost:3000/api/prayer-times?lat=31.5&lng=74.3"

# Response:
# {"fajr": "04:45", "dhuhr": "12:15", "asr": "15:30", "maghrib": "18:42", "isha": "20:00", ...}
```

### Health Check
```bash
curl "http://localhost:3000/api/health"

# Response:
# {"status": "ok", "database": "connected", "timestamp": "2024-09-14T..."}
```

---

## Step 10: Load a Real Book (Optional)

Once testing is complete, try with a real book:

```bash
npm run ingest -- \
  --file=books/khomeini/sample.pdf \
  --title="Islamic Governance - Khomeini" \
  --author="Ayatollah Khomeini"
```

**Note:** PDFs with OCR-only (scanned) pages may need additional setup. For now, test with PDFs that have extractable text layers.

---

## Troubleshooting

### "Database connection failed"
- Check `.env.local` has correct Supabase URL and keys
- Verify you ran the SQL schema in Supabase SQL Editor
- Check internet connection

### "File not found"
- Use absolute path or relative from project root
- Ensure file exists: `ls -la books/your-file.pdf`

### "ANTHROPIC_API_KEY not configured"
- Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local`
- Restart dev server after updating env

### Ingestion is slow
- Large PDFs (>50MB) may take time
- Embedding generation is the bottleneck (50ms per chunk)
- This is expected; optimize later in Phase 2

### Search returns no results
- Embeddings might not be similar enough (random vectors)
- Test with actual Claude embeddings API in Phase 2
- For now, retrieval validates structure is correct

---

## What's Next (Phase 2)

Once Phase 1 is complete and working:
1. Port actual embedding model from Python (or use Claude API embeddings)
2. Add authentication (Supabase Auth)
3. Build chat UI with conversation history
4. Add rate limiting and caching
5. Scale ingestion to 100+ books

---

## Key Files Reference

- **Database schema:** `lib/rag/schema.sql`
- **Ingestion script:** `scripts/ingest-test.ts`
- **RAG engine:** `lib/rag/engine.ts`
- **API routes:** `app/api/chat/route.ts`, `app/api/qibla/route.ts`, etc.
- **Configuration:** `.env.local`, `next.config.ts`, `tsconfig.json`

---

## Testing Checklist

- [ ] Supabase project created
- [ ] Environment variables set in `.env.local`
- [ ] Database schema initialized (all green in SQL Editor)
- [ ] Dependencies installed (`npm install`)
- [ ] Test book prepared
- [ ] Ingestion script runs successfully
- [ ] Data appears in all 4 tables (books, chapters, hadiths, hadith_chunks)
- [ ] Chat endpoint returns results
- [ ] Qibla endpoint works
- [ ] Prayer times endpoint works
- [ ] Health check passes

Once all checks pass, Phase 1 is complete! ✨
