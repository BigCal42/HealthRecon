# HealthRecon

HealthRecon is a minimal but production-ready intelligence layer for healthcare systems. It ingests public and curated content, extracts structured signals, and surfaces the most important activity for go-to-market and research workflows. The app stitches together ingestion → extraction → signal generation, daily briefings, opportunity ideation, and executive-ready summaries across `/systems/[slug]`, `/dashboard`, and `/compare`.

Key capabilities include:
- Automated ingestion via Firecrawl plus Supabase storage, followed by extraction and signal detection pipelines.
- RAG-style chat that answers questions against each system's documents and embeddings.
- Daily briefings, news ingestion, signals, opportunities, and suggested opportunities to keep teams updated.
- Rich system profiles, opportunities boards, dashboards, and comparison views to summarize each health system.
- **Meeting Prep Packs** – one-click LLM-generated meeting/call prep using system context, contacts, opportunities, interactions, and account plans.
- **Signal Actions** – convert signals into recommended sales actions with LLM-generated guidance.
- **Outbound Playbooks** – AI-generated system-specific outbound prep with brief, talk tracks, email openers, and next actions.
- **Outbound Draft Composer** – one-click generation of tailored email and call drafts per system, with copy-to-clipboard.
- **Account Plans** – structured, LLM-assisted account plans per system with editable JSON.
- **Interaction Log** – track calls, emails, meetings, and next steps per system.
- **Worklist View** – unified view of overdue and upcoming next steps plus recently active systems to guide daily sales focus.
- **System Timeline** – unified chronological history of signals, news, interactions, opportunities, and profile changes.
- **Key Contacts & Buying Committee** – maintain structured contact lists per system with roles, seniority, and primary decision makers.
- **System Targeting** – heuristic priority scores per system based on open opportunities, next steps, recent signals, news, and interactions.
- **Global Search** – search across systems, documents, signals, opportunities, interactions, and contacts via a single query.
- **Daily Sales Briefings** – cross-system daily summary of signals, news, opportunities, interactions, and recommended focus.
- **System Health Scores** – composite, explainable account health metrics based on engagement, pipeline, signals, and risk.
- **Cross-System Comparative Intelligence** – compare any two health systems across signals, technology, opportunities, engagement, and overall health.
- **Comparative Narratives & Executive Briefs** – LLM-generated, structured narratives comparing any two health systems, with an executive-ready summary.
- **Living System Narrative** – AI-generated rolling strategic narrative synthesizing signals, news, opportunities, interactions, and account strategy.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │  API Routes  │     │
│  │ (Server)     │  │ (Server/     │  │  (Server)    │     │
│  │              │  │  Client)      │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
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

Data Flow:
1. Ingestion: Firecrawl → Documents → Supabase
2. Processing: Documents → OpenAI Extraction → Entities/Signals → Supabase
3. Embedding: Documents → OpenAI Embeddings → Supabase (pgvector)
4. Query: User Query → Embedding → Vector Search → RAG → Response
5. Generation: Context → OpenAI → Structured Outputs (Briefings, Narratives, etc.)
```

## Tech Stack
- **Framework:** Next.js 15 (App Router, React Server Components, TypeScript)
- **Data & Auth:** Supabase (Postgres + pgvector, SQL migrations in `supabase/`)
- **AI Models:** OpenAI `gpt-4.1-mini` for generation and `text-embedding-3-small` for embeddings
- **Crawling:** Firecrawl API for structured ingestion of target domains
- **Deployment:** Vercel + Supabase + GitHub (`https://github.com/BigCal42/HealthRecon`)

## Getting Started

### Prerequisites
- Node.js 18 LTS or 20 LTS
- A Supabase project with the `pgvector` extension enabled
- OpenAI API key with Responses + Embeddings access
- Firecrawl API key for ingestion

### Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/BigCal42/HealthRecon.git
   cd HealthRecon
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # populate each value before continuing
   ```
4. **Provision Supabase schema**
   
   **Option A: Via Supabase MCP (Recommended)**
   - Migrations are automatically tracked and applied via Supabase MCP
   - All migrations are in `supabase/migrations/` directory
   - See `docs/SUPABASE_ENVIRONMENTS.md` for migration execution details
   
   **Option B: Via Supabase Dashboard**
   - Go to Supabase project → SQL Editor
   - Run migrations sequentially from `supabase/migrations/` directory:
     - `20250101000001_initial_schema.sql`
     - `20250101000002_enable_vector_extension.sql`
     - `20250101000003_document_embeddings.sql`
     - ... (continue through all 20 migrations in order)
     - `20250101000020_enable_rls_policies.sql`
   
   **Option C: Via Supabase CLI**
   ```bash
   supabase db push
   ```
   
   See `docs/SUPABASE_ENVIRONMENTS.md` for detailed migration instructions.
5. **Start the dev server**
   ```bash
   npm run dev
   ```
6. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) and explore `/systems/[slug]`, `/dashboard`, `/compare`, and `/admin/systems`.

### Quickstart: Bootstrap BILH

To get started with a single live account (BILH - Beth Israel Lahey Health), follow these steps:

1. **Ensure environment variables are set**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (required for seeding)

2. **Run the BILH seed script**
   ```bash
   npm run seed:bilh
   ```
   
   This script will:
   - Create or update a `systems` row with slug `bilh` (name: "Beth Israel Lahey Health", website: `https://bilh.org/`)
   - Create a `system_seeds` row pointing to `https://bilh.org/` for crawling
   - The script is idempotent (safe to run multiple times)

3. **Verify the system was created**
   - Visit [http://localhost:3000/systems](http://localhost:3000/systems) - you should see BILH listed
   - Visit [http://localhost:3000/systems/bilh](http://localhost:3000/systems/bilh) - you should see the system overview page

4. **Trigger ingestion** (optional)
   - Navigate to `/systems/bilh` and use the pipeline controls to trigger ingestion
   - Or visit `/systems/bilh/ingestion` to manage seeds and run the pipeline

For detailed information, see [docs/SEED_BILH.md](docs/SEED_BILH.md).

**Schema Reference:**
- `systems` table: See `supabase/migrations/20250101000001_initial_schema.sql` for the full schema
- `system_seeds` table: See `supabase/migrations/20250101000015_system_seeds.sql` for the full schema
- TypeScript types: Generated types are available in `lib/supabase.types.ts`

## Environment Variables
All required keys live in `.env.local`. Copy from `.env.local.example` and supply real values.

**Note:** All environment variables are validated at startup via Zod (`lib/config.ts`). The app will fail fast if required variables are missing.

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project REST URL (safe to expose to the browser). | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser + server requests. | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key for secure server-side operations (rate limiting, admin operations). | Yes |
| `OPENAI_API_KEY` | Used for RAG chat, daily briefings, opportunity suggestions, and profiles (app runtime). | Yes |
| `OPENAI_ADMIN_KEY` | Used ONLY for Cursor MCP and local tooling scripts (NOT by deployed app). | Optional |
| `FIRECRAWL_API_KEY` | Enables Firecrawl-powered ingestion for systems and news feeds. | Yes |
| `FIRECRAWL_BASE_URL` | Firecrawl API base URL. Defaults to `https://api.firecrawl.dev`. | Optional |
| `ADMIN_TOKEN` | Token for admin routes (`/admin/*`). Set a secure random string. | Optional (for admin features) |
| `INTERNAL_API_KEY` | API key for internal routes (`ingest`, `pipeline`, `embed`). Set a secure random string. | Optional (for internal API protection) |
| `NODE_ENV` | Node environment (`development`, `production`, `test`). Defaults to `development`. | Optional |

## Common Commands
- `npm run dev` – Start the local Next.js dev server.
- `npm run lint` – ESLint via `next lint`.
- `npm run type-check` – TypeScript compiler in `--noEmit` mode.
- `npm run test` – Run the Vitest unit suite once.
- `npm run test:watch` – Run the Vitest suite in watch mode.
- `npm run build` – Production build (used locally + by Vercel). **Note:** Requires all environment variables to be set.

## Testing

- **Unit tests:** Vitest suite for core utilities (`lib/api/error.test.ts`, `lib/api/validate.test.ts`, `lib/rateLimit.test.ts`, `lib/openaiClient.test.ts`)
- **Test coverage:** Focus on critical paths (validation, error handling, rate limiting, OpenAI client)
- **Mocking:** OpenAI client tests use mocked responses for reliability

## Code Style & Architecture

### Directory Structure
- `app/` → Next.js App Router routes and API endpoints (`app/api/` for server-side handlers)
- `components/` → React components (client islands marked with `'use client'`)
- `lib/` → Supabase/OpenAI/pipeline helpers, domain logic, and shared utilities
- `config/` → Constants and configuration
- `supabase/` → SQL schema files and migrations
- `scripts/` → Development and testing scripts (e.g., `.http` files for API testing)

### Style Guidelines
- **Server components first:** Prefer server components by default; use client components only when interactivity is required.
- **Thin API routes:** Keep API route handlers (`app/api/`) minimal; move business logic to `lib/` functions.
- **Explicit environment checks:** Use explicit checks for required environment variables and fail fast if missing.
- **Simple functions:** Favor simple, pure functions over classes. Keep functions focused and testable.

## Logging & Monitoring

- Server logs use a centralized structured logger (`lib/logger.ts`) with log levels (debug, info, warn, error)
- Structured JSON logging with request IDs for traceability
- All major pipeline routes log errors clearly with context
- `/api/log-test` can be used to verify logging in Vercel

## Rate Limiting

- **Distributed rate limiting** via Supabase `request_limits` table
- Prevents abuse and large OpenAI/Firecrawl bills across multiple instances
- Rate limits applied to critical routes: `chat`, `embed`, `ingest`, `pipeline`, `sales-briefing`, `compare`, `meeting-prep`, `account-plan`, `signal-actions`, `search`
- Limits reset automatically each window (configurable per route)

## API Standardization

- **Standardized error responses:** All API routes use `apiError`/`apiSuccess` helpers from `lib/api/error.ts`
- **Consistent response format:** `{ ok: boolean, data?: T, error?: { code: string, message: string } }`
- **Input validation:** Zod schemas for request bodies and query parameters via `lib/api/validate.ts`
- **Request size limits:** 1MB maximum request body size enforced

## Security Enhancements

- **Admin authentication:** Cookie-based auth with token expiration (24 hours)
- **Internal API keys:** Sensitive routes (`ingest`, `pipeline`, `embed`) protected with `X-Internal-Api-Key` header
- **Environment validation:** All environment variables validated at startup via Zod (`lib/config.ts`)
- **RLS policies:** Row-level security enabled on all Supabase tables

## OpenAI Client Resilience

- **Retry logic:** Exponential backoff for retryable errors (5xx, 429, network issues)
- **Timeouts:** Configurable timeouts (default 60s) with `AbortController`
- **Structured logging:** Detailed logging of OpenAI interactions (duration, token usage, errors)
- **High-level helpers:** `generateJson` and `embedText` simplify common use cases

## Performance Optimizations

- **Pagination:** List-returning routes (`signal-actions`, `contacts`, `interactions`, `opportunities`, `systems`) support `limit` and `offset`
- **N+1 query fixes:** Batch inserts for entities and signals in processing pipeline
- **Database indexes:** Performance indexes on all frequently queried columns
- **Vector search:** Optimized pgvector queries for RAG functionality

## Deploying to Vercel
1. Push your changes to `main` on GitHub (`https://github.com/BigCal42/HealthRecon`).
2. Connect the repo to Vercel and select the default Next.js build target.
3. Copy all variables from `.env.local.example` into the Vercel project settings (Environment Variables tab).
4. Ensure Supabase URL + anon key + service role key and the OpenAI / Firecrawl keys are configured.
5. Trigger a deployment from `main`. Vercel will run `npm install`, `npm run build`, and host the resulting app.

Once deployed, confirm `/systems/[slug]`, `/dashboard`, and `/compare` load successfully and that Supabase + OpenAI credentials are active.

### Post-deploy checklist (Vercel)

* Visit `/health` – verify:
  * `ok: true`
  * `supabase: "ok"`
  * `openaiConfigured: true`
  * `firecrawlConfigured: true` (if you intend to use crawling)
* Visit `/dashboard` – confirm systems load
* Visit `/systems/<slug>` – confirm:
  * Overview renders
  * Actions don't error
  * Chat returns an answer

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
- Run `npm run type-check` to see specific errors
- Ensure all environment variables are set
- Check that `tsconfig.json` is properly configured

**Supabase connection errors**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active and not paused
- Ensure RLS policies allow necessary operations

**OpenAI API errors**
- Verify `OPENAI_API_KEY` is set and valid
- Check API key has access to `gpt-4.1-mini` and embeddings models
- Monitor rate limits and usage in OpenAI dashboard

**Firecrawl ingestion fails**
- Verify `FIRECRAWL_API_KEY` is set
- Check seed URLs are valid and accessible
- Review Firecrawl API status and quotas

**Embeddings not working**
- Ensure `pgvector` extension is enabled in Supabase
- Run `embeddings.sql` migration if not already done
- Check document embeddings table exists and has proper schema

**Admin routes return 500**
- Set `ADMIN_TOKEN` environment variable
- Clear cookies and re-authenticate at `/admin/login`

**Performance issues**
- Run `add_performance_indexes.sql` migration if not already done
- Check Supabase query performance in dashboard
- Monitor API route response times in Vercel logs

### Getting Help

- Check logs: Use `/api/log-test` to verify logging works
- Health check: Visit `/health` to verify all services are configured
- Database: Check Supabase logs for query errors
- API: Check Vercel function logs for runtime errors

## Supabase Setup Checklist

### Prerequisites
- ✅ Supabase account created
- ✅ Supabase project created (dev environment)
- ✅ Project URL and API keys obtained from Supabase dashboard

### Environment Setup
1. **Create `.env.local` file**
   ```bash
   cp .env.example .env.local
   ```
2. **Add Supabase credentials**
   - Copy `NEXT_PUBLIC_SUPABASE_URL` from Supabase dashboard (Project Settings → API)
   - Copy `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - Copy `SUPABASE_SERVICE_ROLE_KEY` (service_role key, optional)
3. **Add other required keys**
   - `OPENAI_API_KEY` (required for app runtime)
   - `OPENAI_ADMIN_KEY` (optional, for Cursor MCP and tooling only)
   - `FIRECRAWL_API_KEY`
   - `ADMIN_TOKEN` (optional)

### Database Setup
1. **Apply migrations**
   - See "Provision Supabase schema" section above for migration options
   - All migrations are in `supabase/migrations/` directory
   - Migrations are numbered and should be applied sequentially
2. **Verify schema**
   - Check Supabase dashboard → Database → Tables (should see 19 tables)
   - Check Extensions: `vector`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`
   - Check RLS: All tables should have RLS enabled
3. **Verify seed data**
   - Check `systems` table has at least one row (BILH system)
   - Check `news_sources` table has 3 rows
   - Check `system_seeds` table has at least one row

### Verification Steps
1. **Test connection**
   ```bash
   npm run dev
   ```
   Visit `/health` - should show `supabase: "ok"`
2. **Test database queries**
   - Visit `/dashboard` - should load systems
   - Visit `/systems/bilh` - should load system page
3. **Check TypeScript types**
   ```bash
   npm run type-check
   ```
   Should pass without errors (types are generated from live schema)

### For New Environments (Stage/Prod)
1. Create new Supabase project
2. Apply all migrations sequentially
3. Copy seed data if needed
4. Update environment variables in Vercel
5. Verify schema alignment via Supabase dashboard or MCP

See `docs/SUPABASE_ENVIRONMENTS.md` for detailed environment configuration.
See `docs/SUPABASE_PLAN.md` for architecture and migration details.

