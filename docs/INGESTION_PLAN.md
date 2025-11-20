# HealthRecon Ingestion Pipeline Plan

## Overview

HealthRecon ingests content from healthcare systems and news sources using Firecrawl, stores it in Supabase, and processes it through extraction and signal detection pipelines.

## Current Ingestion Model

### Data Sources

1. **System Seeds** (`system_seeds` table)
   - Stores seed URLs per healthcare system
   - Each row: `system_id`, `url`, `active` flag
   - Example: BILH system has seed `https://bilh.org`
   - Only `active=true` seeds are crawled

2. **News Sources** (`news_sources` table)
   - Stores news feed URLs (independent of systems)
   - Each row: `name`, `url`, `active` flag
   - Crawled separately from system seeds

### Current Data Flow

```
system_seeds (active=true) → Firecrawl /v1/crawl → pages[] → 
hash deduplication → documents table → processing pipeline
```

### Documents Table Structure

The `documents` table stores crawled content with the following fields:

- `id` (uuid) - Primary key
- `system_id` (uuid, nullable) - Links to `systems` table (null for news sources)
- `source_url` (text) - The crawled URL
- `source_type` (text) - "website" for system seeds, "news" for news sources
- `title` (text, nullable) - Page title from Firecrawl
- `raw_text` (text, nullable) - Extracted text content
- `hash` (text) - SHA-256 hash of `raw_text` for deduplication
- `processed` (boolean) - Flag indicating if document has been processed
- `crawled_at` (timestamptz) - Timestamp when document was crawled

### Deduplication Strategy

- Content is hashed using SHA-256 (`hashText()` function)
- Before inserting, check if `hash` already exists for the same `system_id`
- If hash exists, skip insertion (prevents duplicate content)
- Hash is computed from `raw_text` content, not URL

### Current Firecrawl Usage

- **Endpoint:** `https://api.firecrawl.dev/v1/crawl`
- **Method:** POST with JSON body `{ url: string }`
- **Response:** `{ success: boolean, pages?: FirecrawlPage[] }`
- **FirecrawlPage:** `{ url: string, title?: string, content?: string }`
- Currently uses direct `fetch` calls (no collections/projects)
- Synchronous crawling (waits for results)

## Canonical Pipeline

### System Ingestion Flow

1. **Input:**
   - `system_id` (from `systems` table)
   - All active `system_seeds` URLs for that system

2. **Firecrawl:**
   - For each seed URL:
     - `POST /v1/crawl` with `{ url: seed.url }`
     - Receive `{ success, pages[] }`
     - Each page contains: `url`, `title`, `content`

3. **HealthRecon Processing:**
   - For each page:
     - Skip if `content` is empty
     - Compute `hash = hashText(page.content)`
     - Check if `hash` exists for this `system_id`
     - If duplicate, skip
     - If new, insert into `documents`:
       - `system_id` = system ID
       - `source_url` = `page.url ?? seed.url`
       - `source_type` = `"website"`
       - `title` = `page.title ?? null`
       - `raw_text` = `page.content`
       - `hash` = computed hash
       - `crawled_at` = current timestamp
       - `processed` = `false`

4. **Post-Ingestion:**
   - Documents are processed via `/api/pipeline` or `/api/process`
   - Processing extracts entities and signals
   - Documents are embedded for vector search

### News Ingestion Flow

Similar to system ingestion, but:
- Uses `news_sources` table instead of `system_seeds`
- Sets `system_id` = `null` in `documents`
- Sets `source_type` = `"news"`
- Deduplication checks `hash` where `system_id IS NULL`

## Field Mappings

### Firecrawl → Documents

| Firecrawl Field | Documents Field | Notes |
|----------------|----------------|-------|
| `pages[].url` | `source_url` | Fallback to seed URL if missing |
| `pages[].content` | `raw_text` | Required, skip if empty |
| `pages[].title` | `title` | Nullable |
| Current timestamp | `crawled_at` | Set at insert time |
| `hashText(content)` | `hash` | SHA-256 hash for deduplication |
| System context | `system_id` | From ingestion context |
| Source type | `source_type` | "website" or "news" |

## BILH Smoke Test Procedure

### Prerequisites

1. BILH system exists in `systems` table (slug: `bilh`)
2. At least one active seed URL exists in `system_seeds` for BILH
3. Firecrawl API key is configured (`FIRECRAWL_API_KEY`)
4. Supabase connection is working

### Test Steps

1. **Verify System and Seeds (via Supabase MCP):**
   ```sql
   SELECT id, slug, name FROM systems WHERE slug = 'bilh';
   SELECT id, system_id, url, active FROM system_seeds WHERE system_id = (SELECT id FROM systems WHERE slug = 'bilh');
   ```

2. **Trigger Test Crawl:**
   - Option A: Call `/api/ingest` endpoint:
     ```bash
     curl -X POST http://localhost:3000/api/ingest \
       -H "Content-Type: application/json" \
       -d '{"slug": "bilh"}'
     ```
   - Option B: Call `/api/pipeline` endpoint (runs ingest + process):
     ```bash
     curl -X POST http://localhost:3000/api/pipeline \
       -H "Content-Type: application/json" \
       -d '{"slug": "bilh"}'
     ```

3. **Verify Documents Created (via Supabase MCP):**
   ```sql
   SELECT 
     id, 
     system_id, 
     source_url, 
     source_type, 
     title, 
     crawled_at,
     hash
   FROM documents 
   WHERE system_id = (SELECT id FROM systems WHERE slug = 'bilh')
   ORDER BY crawled_at DESC
   LIMIT 10;
   ```

4. **Validation Checks:**
   - ✅ `system_id` matches BILH system ID
   - ✅ `source_url` contains bilh.org URLs
   - ✅ `source_type` is "website"
   - ✅ `hash` values are unique (no duplicates)
   - ✅ `crawled_at` is set (recent timestamp)
   - ✅ `title` is populated (if available from Firecrawl)
   - ✅ `raw_text` is populated (non-empty)

5. **Test Error Handling:**
   - Invalid URL → should continue, not fail entire pipeline
   - Firecrawl API error → should log and continue
   - Duplicate content → should skip insert (hash check)

### Expected Results

- At least one document should be created for BILH
- Documents should have valid URLs from bilh.org domain
- No duplicate hashes for the same system_id
- Crawl should complete without errors (even if some URLs fail)

## Firecrawl Operational Limits & Guardrails

### Rate Limits

- **Firecrawl API:** Check Firecrawl documentation for current rate limits
- **Recommendation:** Implement rate limiting in ingestion endpoints to prevent abuse
- **Current:** Rate limiting exists at API route level (5 requests per minute per IP)

### Max Pages Per Crawl

- **Default:** Firecrawl may limit pages per crawl (check API docs)
- **Recommendation:** Set reasonable limits per seed URL (e.g., 100-500 pages)
- **Current:** No explicit limit set in code (relies on Firecrawl defaults)

### Crawl Frequency

- **v1:** Manual triggers only
  - `/api/ingest` - Ingestion only
  - `/api/pipeline` - Ingestion + processing
- **Future:** Consider scheduled crawls (cron jobs) for regular updates
- **Recommendation:** Don't crawl more than once per day per system (unless manual override)

### Cost Considerations

- **Firecrawl Pricing:** Typically per page crawled or per crawl job
- **Recommendation:** Monitor Firecrawl usage dashboard
- **Optimization:** Use deduplication to avoid re-crawling unchanged content
- **Budget:** Set alerts for unexpected usage spikes

### Filters & Exclusions

- **Binary Files:** Firecrawl should skip binary files automatically
- **Large PDFs:** Consider excluding very large PDFs if they cause issues
- **Depth Limits:** Consider setting max crawl depth per seed URL
- **Domain Restrictions:** Ensure crawls stay within seed domain (Firecrawl handles this)

### Manual Ingestion Workflow

1. **For a Single System:**
   ```bash
   curl -X POST http://localhost:3000/api/ingest \
     -H "Content-Type: application/json" \
     -d '{"slug": "system-slug"}'
   ```

2. **For Full Pipeline (Ingest + Process):**
   ```bash
   curl -X POST http://localhost:3000/api/pipeline \
     -H "Content-Type: application/json" \
     -d '{"slug": "system-slug"}'
   ```

3. **For News Sources:**
   ```bash
   curl -X POST http://localhost:3000/api/news-ingest
   ```

### Error Handling

- **Single URL Failure:** Should not block entire pipeline
- **Firecrawl API Errors:** Log error, continue with next URL
- **Network Timeouts:** Implement timeout handling (e.g., 60 seconds per crawl)
- **Rate Limit Errors:** Implement exponential backoff or queue system

### Monitoring

- **Logs:** Check Vercel function logs for ingestion errors
- **Database:** Monitor `documents` table growth
- **Firecrawl Dashboard:** Monitor API usage and errors
- **Health Check:** Use `/api/health` to verify Firecrawl configuration

## Future Enhancements

### Potential Schema Additions

- `crawl_depth` - Track how deep the crawl went
- `parent_url` - Track parent URL for nested pages
- `metadata` (JSONB) - Store additional Firecrawl metadata
- `crawl_job_id` - Track Firecrawl job ID for async crawls

### Collection/Project Support

- If Firecrawl introduces collections/projects:
  - Add `collection_id` parameter to crawl calls
  - Map systems to collections for better organization
  - Support environment-specific collections

### Async Crawl Support

- If Firecrawl supports async jobs:
  - Implement job status polling
  - Store `crawl_job_id` in database
  - Poll for completion before processing results

### Incremental Crawls

- Track last crawl timestamp per system
- Only crawl new/changed pages
- Use Firecrawl's change detection if available

