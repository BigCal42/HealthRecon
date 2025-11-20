# Supabase Migration & Configuration Plan

## Current State (As-Is) - Phase 0 Discovery

**Last Updated:** 2025-01-21

### Database Status (via MCP Inspection)

**Project Information:**
- Project URL: `https://jsewfrvuivhcwqkziuge.supabase.co`
- Project ID: `jsewfrvuivhcwqkziuge`

**Current Database State:**
- **Tables:** None (empty database)
- **Migrations Tracked:** None
- **RLS Policies:** None

**Extensions Installed:**
- `pgcrypto` (v1.3) - Cryptographic functions
- `uuid-ossp` (v1.1) - UUID generation
- `pg_stat_statements` (v1.11) - Query performance monitoring

**Extensions Missing:**
- `vector` (v0.8.0 available) - **REQUIRED** for document embeddings and RAG functionality

### Codebase Status

**SQL Schema Files (18 files in `supabase/` directory):**
1. `schema.sql` - Base tables: `systems`, `documents`, `entities`, `signals`
2. `embeddings.sql` - `document_embeddings` table + `match_documents_for_system()` function
3. `daily_briefings.sql` - `daily_briefings` table
4. `opportunities.sql` - `opportunities` table
5. `contacts.sql` - `contacts` table
6. `interactions.sql` - `interactions` table
7. `account_plans.sql` - `account_plans` table
8. `system_profiles.sql` - `system_profiles` table
9. `signal_actions.sql` - `signal_actions` table
10. `system_narratives.sql` - `system_narratives` table
11. `sales_briefings.sql` - `sales_briefings` table
12. `opportunity_suggestions.sql` - `opportunity_suggestions` table
13. `outbound_playbooks.sql` - `outbound_playbooks` table
14. `system_seeds.sql` - `system_seeds` table
15. `news_sources.sql` - `news_sources` table
16. `run_logs.sql` - `pipeline_runs`, `daily_briefing_runs` tables
17. `feedback.sql` - `feedback` table
18. `add_performance_indexes.sql` - Performance indexes for all tables

**Type System:**
- Types manually defined in `lib/types.ts`
- No generated Supabase types
- Client wrapper in `lib/supabaseClient.ts` uses untyped `createClient()`

**Environment Configuration:**
- No `.env.example` file
- Environment variables referenced in README:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (documented but unused in code)

**Migration Infrastructure:**
- No `supabase/migrations/` directory
- SQL files are standalone, not organized as migrations
- No migration tracking system

### Schema Inventory

**Expected Tables (from SQL files):**

1. **Core Tables:**
   - `systems` - Health system entities
   - `documents` - Ingested documents (website, news, PDFs)
   - `entities` - Extracted entities (people, facilities, initiatives, vendors, technology)
   - `signals` - Extracted signals (leadership changes, strategy, technology, etc.)

2. **Embeddings & Search:**
   - `document_embeddings` - Vector embeddings for RAG search
   - Function: `match_documents_for_system()` - Vector similarity search

3. **Business Objects:**
   - `opportunities` - Sales opportunities
   - `opportunity_suggestions` - AI-suggested opportunities
   - `contacts` - Key contacts per system
   - `interactions` - Logged interactions (calls, emails, meetings)
   - `account_plans` - Structured account plans (JSONB)
   - `system_profiles` - System profiles (JSONB)

4. **AI-Generated Content:**
   - `daily_briefings` - Daily briefings per system
   - `sales_briefings` - Cross-system daily sales briefings
   - `system_narratives` - Living system narratives
   - `signal_actions` - AI-generated action recommendations from signals
   - `outbound_playbooks` - Outbound prep playbooks

5. **Configuration & Logging:**
   - `system_seeds` - Seed URLs for ingestion per system
   - `news_sources` - News source URLs for ingestion
   - `pipeline_runs` - Ingestion/processing run logs
   - `daily_briefing_runs` - Daily briefing generation logs
   - `feedback` - User feedback on AI outputs

**Total Expected Tables:** 20 tables + 1 function

**Note:** Added `request_limits` table (migration `20250101000021_request_limits.sql`) for distributed rate limiting.

### Identified Gaps

1. **Missing Extension:** `vector` extension not enabled (required for embeddings)
2. **No RLS Policies:** All tables lack Row Level Security policies
3. **No Migration Tracking:** SQL files not organized as tracked migrations
4. **No Type Generation:** Types manually maintained instead of generated from schema
5. **No Environment Documentation:** Missing `.env.example` and environment strategy docs
6. **Service Role Key:** Documented but not implemented in client code

### Next Steps

See phases below for detailed implementation plan.

---

## Architecture Overview

HealthRecon uses Supabase as its primary data store with the following architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Pages      │  │  Components  │  │  API Routes  │       │
│  │ (Server)     │  │ (Server/     │  │  (Server)    │       │
│  │              │  │  Client)      │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │    OpenAI    │  │  Firecrawl   │
│  (Postgres + │  │  (GPT-4.1-   │  │     API      │
│   pgvector)  │  │    mini +    │  │              │
│              │  │  embeddings) │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Data Flow:**
1. **Ingestion:** Firecrawl → Documents → Supabase
2. **Processing:** Documents → OpenAI Extraction → Entities/Signals → Supabase
3. **Embedding:** Documents → OpenAI Embeddings → Supabase (pgvector)
4. **Query:** User Query → Embedding → Vector Search → RAG → Response
5. **Generation:** Context → OpenAI → Structured Outputs (Briefings, Narratives, etc.)

---

## Environment Strategy

See `docs/SUPABASE_ENVIRONMENTS.md` for detailed environment configuration.

**Environments:**
- **Dev:** `jsewfrvuivhcwqkziuge` (current project)
- **Stage:** TBD (optional)
- **Prod:** TBD (optional)

---

## Schema Summary

### Core Tables

**systems**
- Primary entity representing healthcare systems
- Fields: `id`, `slug` (unique), `name`, `website`, `hq_city`, `hq_state`, `created_at`, `updated_at`

**documents**
- Ingested content from websites, news sources, PDFs
- Fields: `id`, `system_id` (FK), `source_url`, `source_type`, `title`, `raw_text`, `hash`, `processed`, `crawled_at`
- Unique constraint: `(system_id, hash)`

**entities**
- Extracted entities (people, facilities, initiatives, vendors, technology)
- Fields: `id`, `system_id` (FK), `type`, `name`, `role`, `attributes` (JSONB), `source_document_id` (FK), `created_at`

**signals**
- Extracted signals (leadership changes, strategy, technology, finance, workforce, AI, Epic migrations)
- Fields: `id`, `system_id` (FK), `document_id` (FK), `severity`, `category`, `summary`, `details` (JSONB), `created_at`

### Embeddings & Vector Search

**document_embeddings**
- Vector embeddings for semantic search (1536 dimensions)
- Fields: `id`, `document_id` (FK, unique), `embedding` (vector(1536)), `created_at`
- Function: `match_documents_for_system(query_embedding, system_id, match_count)` - Returns top N similar documents

### Business Objects

**opportunities**
- Sales opportunities per system
- Fields: `id`, `system_id` (FK), `title`, `description`, `status` (open/in_progress/won/lost/closed), `source_kind`, `source_id`, `created_at`, `updated_at`

**opportunity_suggestions**
- AI-suggested opportunities
- Fields: `id`, `system_id` (FK), `title`, `description`, `source_kind`, `source_ids` (uuid[]), `created_at`, `accepted`, `accepted_opportunity_id`

**contacts**
- Key contacts per system
- Fields: `id`, `system_id` (FK), `full_name`, `title`, `department`, `email`, `phone`, `seniority`, `role_in_deal`, `notes`, `is_primary`, `created_at`

**interactions**
- Logged interactions (calls, emails, meetings)
- Fields: `id`, `system_id` (FK), `occurred_at`, `channel`, `subject`, `summary`, `next_step`, `next_step_due_at`, `created_at`

**account_plans**
- Structured account plans (JSONB)
- Fields: `id`, `system_id` (FK), `summary` (JSONB), `created_at`

**system_profiles**
- System profiles (JSONB)
- Fields: `id`, `system_id` (FK), `summary` (JSONB), `created_at`

### AI-Generated Content

**daily_briefings**
- Daily briefings per system
- Fields: `id`, `system_id` (FK), `summary`, `created_at`

**sales_briefings**
- Cross-system daily sales briefings
- Fields: `id`, `generated_for_date`, `summary` (JSONB), `created_at`

**system_narratives**
- Living system narratives
- Fields: `id`, `system_id` (FK), `narrative` (JSONB), `created_at`

**signal_actions**
- AI-generated action recommendations from signals
- Fields: `id`, `system_id` (FK), `signal_id` (FK), `action_category`, `action_description`, `confidence` (1-100), `created_at`

**outbound_playbooks**
- Outbound prep playbooks
- Fields: `id`, `system_id` (FK), `summary` (JSONB), `created_at`

### Configuration & Logging

**system_seeds**
- Seed URLs for ingestion per system
- Fields: `id`, `system_id` (FK), `url`, `active`, `created_at`

**news_sources**
- News source URLs for ingestion
- Fields: `id`, `name`, `url`, `active`, `created_at`

**pipeline_runs**
- Ingestion/processing run logs
- Fields: `id`, `system_id` (FK), `status`, `ingest_created`, `process_processed`, `error_message`, `created_at`

**daily_briefing_runs**
- Daily briefing generation logs
- Fields: `id`, `system_id` (FK), `status`, `briefing_id`, `error_message`, `created_at`

**feedback**
- User feedback on AI outputs
- Fields: `id`, `system_id` (FK), `kind`, `target_id`, `sentiment`, `comment`, `created_at`

**request_limits**
- Distributed rate limiting across multiple application instances
- Fields: `id`, `key` (text), `window_start` (timestamp), `count` (integer), `created_at`
- Unique constraint: `(key, window_start)`
- Used by `lib/rateLimit.ts` for Supabase-backed rate limiting

---

## RLS & Auth Overview

**Current State:** RLS enabled on all tables with authenticated user policies.

**V1 Strategy (Implemented):**
- RLS enabled on all 19 tables
- Simple authenticated user access (read/write/delete) for single-user/low-user scenario
- All tables accessible to authenticated users via RLS policies
- Service role key bypasses RLS for server-side operations (optional, not currently used in code)

**Future (Multi-User/Org Support):**
- Add `user_id` or `org_id` columns to relevant tables
- Update RLS policies to filter by user/org ownership
- Migration path documented in `20250101000020_enable_rls_policies.sql`

**Policy Summary:**
- Each table has 4 policies: SELECT, INSERT, UPDATE, DELETE
- All policies use `to authenticated` role
- All policies use `using (true)` / `with check (true)` for v1 simplicity

---

## Performance & Index Highlights

**Key Indexes (from `add_performance_indexes.sql`):**

- **Documents:** `system_id`, `source_type`, `processed`, `crawled_at`
- **Signals:** `system_id`, `severity`, `category`, `created_at`, `document_id`
- **Entities:** `system_id`, `type`, `created_at`
- **Opportunities:** `system_id`, `status`, `created_at`, `updated_at`
- **Contacts:** `system_id`, `is_primary`, `created_at`
- **Interactions:** `system_id`, `occurred_at`, `next_step_due_at` (partial), `created_at`
- **Signal Actions:** `system_id`, `signal_id`, `created_at`
- **System Profiles:** `system_id`, `created_at`
- **Daily Briefings:** `system_id`, `created_at`
- **Sales Briefings:** `generated_for_date`, `created_at`
- **System Narratives:** `system_id`, `created_at`
- **Account Plans:** `system_id`, `created_at`
- **Opportunity Suggestions:** `system_id`, `accepted`, `created_at`
- **Outbound Playbooks:** `system_id`, `created_at`
- **System Seeds:** `system_id`, `active`, `created_at`
- **News Sources:** `active`
- **Document Embeddings:** `document_id`
- **Pipeline Runs:** `system_id`, `run_type`, `created_at`
- **Feedback:** `system_id`, `created_at`
- **Systems:** `created_at`, `updated_at`

**Vector Search:**
- Uses `pgvector` extension (v0.8.0) - enabled and verified
- Vector similarity search via `match_documents_for_system()` function
- Embedding dimension: 1536 (OpenAI `text-embedding-3-small`)

**Extensions Verified:**
- ✅ `vector` (v0.8.0) - Enabled for embeddings
- ✅ `pgcrypto` (v1.3) - UUID generation
- ✅ `uuid-ossp` (v1.1) - UUID generation
- ✅ `pg_stat_statements` (v1.11) - Query performance monitoring

**Indexes Verified:**
- ✅ All performance indexes from migration `20250101000019_performance_indexes` are created
- ✅ Primary keys and unique constraints in place
- ✅ Foreign key indexes automatically created by PostgreSQL

---

## Migration Strategy

**Approach:**
1. Convert existing SQL files to numbered migration files
2. Apply migrations sequentially via Supabase MCP
3. All migrations use idempotent patterns (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
4. Track migrations in Supabase migration system

**Migration Order:**
1. Base schema (systems, documents, entities, signals)
2. Vector extension + embeddings
3. Business objects (opportunities, contacts, interactions, etc.)
4. AI-generated content tables
5. Configuration & logging tables
6. Performance indexes
7. RLS policies

**Rollback Strategy:**
- Forward-only migrations (no destructive changes)
- Manual rollback via Supabase dashboard if needed
- Document rollback procedures in monitoring section

---

## Monitoring & Operations

### Backups

**Supabase Default:**
- Automatic daily backups (Supabase managed)
- Point-in-time recovery available on Pro plan

**Additional Strategy:**
- Export schema via `pg_dump` before major migrations
- Document backup verification procedures

### Migration Rollback

**Procedure:**
1. Identify migration version to rollback to
2. Use Supabase dashboard to revert migration
3. Or manually run reverse SQL (if destructive changes)
4. Verify schema state via MCP introspection

**Note:** Current migrations are forward-only (non-destructive), so rollback is typically not needed.

### Environment Cloning

**Dev → Stage/Prod:**
1. Create new Supabase project
2. Apply all migrations sequentially
3. Copy seed data if needed (systems, news_sources)
4. Update environment variables in Vercel
5. Verify schema alignment via MCP

**Prod → Dev (for testing):**
1. Export production schema
2. Apply to dev project
3. Anonymize sensitive data if needed

### Performance Monitoring

**Key Metrics:**
- Query performance (via `pg_stat_statements`)
- Vector search latency
- Embedding generation throughput
- API route response times

**Tools:**
- Supabase dashboard query performance
- Vercel function logs
- Application-level logging (`lib/logger.ts`)

---

## Implementation Status

1. ✅ Phase 0: Discovery & Inspection (Complete)
2. ✅ Phase 1: Environment & Project Strategy (Complete)
3. ✅ Phase 2: Schema & Migration Plan (Complete - 21 migrations applied, including `request_limits` table)
4. ✅ Phase 3: Auth, RLS, and Security Best Practices (Complete - RLS enabled on all tables)
5. ✅ Phase 4: Supabase Types & Client Configuration (Complete - Types generated and client updated)
6. ✅ Phase 5: Performance, Extensions, and Monitoring (Complete - Extensions and indexes verified)
7. ✅ Phase 6: Documentation & Checklists (Complete)
8. ✅ Phase 7: Final Sanity & Validation (Complete)

## Recent Optimizations (2025-01-21)

### API Standardization
- ✅ Standardized error responses (`lib/api/error.ts`) across all 31 API routes
- ✅ Zod-based input validation (`lib/api/validate.ts`) for request bodies and query parameters
- ✅ Request size limits (1MB) enforced

### Distributed Rate Limiting
- ✅ Supabase-backed rate limiting via `request_limits` table (migration `20250101000021_request_limits.sql`)
- ✅ Service role key used for rate limit operations
- ✅ Rate limiting integrated into critical routes

### Security Enhancements
- ✅ Admin cookie authentication with token expiration (24 hours)
- ✅ Internal API key validation for sensitive routes (`ingest`, `pipeline`, `embed`)
- ✅ Environment variable validation at startup via Zod

### OpenAI Client Resilience
- ✅ Retry logic with exponential backoff
- ✅ Configurable timeouts (default 60s)
- ✅ Structured logging for OpenAI interactions
- ✅ High-level helpers (`generateJson`, `embedText`)

### Performance Optimizations
- ✅ Pagination added to list-returning routes
- ✅ N+1 query fixes (batch inserts for entities and signals)
- ✅ Enhanced logging with request IDs and structured JSON output

### Testing
- ✅ Unit tests for rate limiting, validation, error helpers, and OpenAI client (mocked)

