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
   Run each file inside `supabase/` via the Supabase SQL editor in this order:
   - `schema.sql` (base tables: systems, documents, entities, signals)
   - `daily_briefings.sql`
   - `embeddings.sql`
   - `feedback.sql`
   - `news_sources.sql`
   - `opportunities.sql`
   - `opportunity_suggestions.sql`
   - `outbound_playbooks.sql`
   - `account_plans.sql`
   - `run_logs.sql`
   - `system_profiles.sql`
   - `system_seeds.sql`
   - `contacts.sql`
   - `interactions.sql`
   - `signal_actions.sql`
   - `system_narratives.sql`
   - `sales_briefings.sql`
   - `add_performance_indexes.sql` (performance optimization - run last)
5. **Start the dev server**
   ```bash
   npm run dev
   ```
6. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) and explore `/systems/[slug]`, `/dashboard`, `/compare`, and `/admin/systems`.

## Environment Variables
All required keys live in `.env.local`. Copy from `.env.local.example` and supply real values.

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project REST URL (safe to expose to the browser). | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser + server requests. | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key for secure server-side helpers or scripts. | Yes |
| `OPENAI_API_KEY` | Used for RAG chat, daily briefings, opportunity suggestions, and profiles. | Yes |
| `FIRECRAWL_API_KEY` | Enables Firecrawl-powered ingestion for systems and news feeds. | Yes |
| `ADMIN_TOKEN` | Token for admin routes (`/admin/*`). Set a secure random string. | Optional (for admin features) |

## Common Commands
- `npm run dev` – Start the local Next.js dev server.
- `npm run lint` – ESLint via `next lint`.
- `npm run type-check` – TypeScript compiler in `--noEmit` mode.
- `npm run test` – Run the Vitest unit suite once.
- `npm run test:watch` – Run the Vitest suite in watch mode.
- `npm run build` – Production build (used locally + by Vercel).

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

- Server logs use a small centralized logger (`lib/logger.ts`)
- All major pipeline routes log errors clearly
- `/api/log-test` can be used to verify logging in Vercel

## Rate Limiting

- Expensive API routes use an in-memory token bucket
- Prevents abuse and large OpenAI/Firecrawl bills
- Limits reset automatically each window

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

