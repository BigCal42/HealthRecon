# HealthRecon

HealthRecon is a minimal but production-ready intelligence layer for healthcare systems. It ingests public and curated content, extracts structured signals, and surfaces the most important activity for go-to-market and research workflows. The app stitches together ingestion → extraction → signal generation, daily briefings, opportunity ideation, and executive-ready summaries across `/systems/[slug]`, `/dashboard`, and `/compare`.

Key capabilities include:
- Automated ingestion via Firecrawl plus Supabase storage, followed by extraction and signal detection pipelines.
- RAG-style chat that answers questions against each system’s documents and embeddings.
- Daily briefings, news ingestion, signals, opportunities, and suggested opportunities to keep teams updated.
- Rich system profiles, opportunities boards, dashboards, and comparison views to summarize each health system.

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
   Run each file inside `supabase/` via the Supabase SQL editor (order shown below):
   - `schema.sql`
   - `daily_briefings.sql`
   - `embeddings.sql`
   - `feedback.sql`
   - `news_sources.sql`
   - `opportunities.sql`
   - `opportunity_suggestions.sql`
   - `run_logs.sql`
   - `system_profiles.sql`
   - `system_seeds.sql`
5. **Start the dev server**
   ```bash
   npm run dev
   ```
6. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) and explore `/systems/[slug]`, `/dashboard`, `/compare`, and `/admin/systems`.

## Environment Variables
All required keys live in `.env.local`. Copy from `.env.local.example` and supply real values.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project REST URL (safe to expose to the browser). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser + server requests. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key for secure server-side helpers or scripts. |
| `OPENAI_API_KEY` | Used for RAG chat, daily briefings, opportunity suggestions, and profiles. |
| `FIRECRAWL_API_KEY` | Enables Firecrawl-powered ingestion for systems and news feeds. |

## Common Commands
- `npm run dev` – Start the local Next.js dev server.
- `npm run lint` – ESLint via `next lint`.
- `npm run type-check` – TypeScript compiler in `--noEmit` mode.
- `npm run build` – Production build (used locally + by Vercel).

## Deploying to Vercel
1. Push your changes to `main` on GitHub (`https://github.com/BigCal42/HealthRecon`).
2. Connect the repo to Vercel and select the default Next.js build target.
3. Copy all variables from `.env.local.example` into the Vercel project settings (Environment Variables tab).
4. Ensure Supabase URL + anon key + service role key and the OpenAI / Firecrawl keys are configured.
5. Trigger a deployment from `main`. Vercel will run `npm install`, `npm run build`, and host the resulting app.

Once deployed, confirm `/systems/[slug]`, `/dashboard`, and `/compare` load successfully and that Supabase + OpenAI credentials are active.

