# Supabase Environment Configuration

This document defines the environment strategy for HealthRecon's Supabase projects.

## Environment Matrix

| Environment | Supabase Project | Project ID | Purpose | Status |
|------------|------------------|------------|---------|--------|
| **Dev** | HealthRecon Dev | `jsewfrvuivhcwqkziuge` | Local development & testing | ✅ Active |
| **Stage** | HealthRecon Stage | TBD | Pre-production testing | ⏳ Optional |
| **Prod** | HealthRecon Prod | TBD | Production | ⏳ TBD |

## Environment Variables

### Required Variables

All environments require the following environment variables:

| Variable | Description | Where Set | Required For |
|----------|-------------|-----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project REST URL (safe to expose to browser) | Local `.env.local`, Vercel | All environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key for browser + server requests | Local `.env.local`, Vercel | All environments |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for secure server-side operations | Local `.env.local`, Vercel (server-side only) | Server-side operations (optional) |

### Optional Variables

| Variable | Description | Where Set | Required For |
|----------|-------------|-----------|--------------|
| `OPENAI_API_KEY` | OpenAI API key for LLM operations (app runtime) | Local `.env.local`, Vercel | AI features |
| `OPENAI_ADMIN_KEY` | OpenAI admin key for Cursor MCP and tooling (NOT deployed) | Local `.env.local` only | Development tooling |
| `FIRECRAWL_API_KEY` | Firecrawl API key for web crawling | Local `.env.local`, Vercel | Ingestion features |
| `FIRECRAWL_BASE_URL` | Firecrawl API base URL (optional, defaults to `https://api.firecrawl.dev`) | Local `.env.local`, Vercel | Ingestion features (optional) |
| `ADMIN_TOKEN` | Token for admin routes (`/admin/*`) | Local `.env.local`, Vercel | Admin features |

## Environment Setup

### Dev Environment

**Current Project:** `jsewfrvuivhcwqkziuge`
**URL:** `https://jsewfrvuivhcwqkziuge.supabase.co`

**Setup Steps:**
1. Create `.env.local` file in project root (copy from `.env.example`)
2. Get credentials from Supabase dashboard:
   - Project Settings → API
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (optional)
3. Run migrations (see Migration section below)
4. Verify connection: `npm run dev` and visit `/health`

**Local Development:**
- Uses `.env.local` file (gitignored)
- All API routes use `createServerSupabaseClient()`
- Browser components use `createBrowserSupabaseClient()`

### Stage Environment (Optional)

**Setup Steps:**
1. Create new Supabase project in Supabase dashboard
2. Note project ID and URL
3. Update this document with project details
4. Configure environment variables in Vercel:
   - Go to Vercel project settings → Environment Variables
   - Add all required variables for "Preview" environment
5. Apply all migrations to stage project
6. Verify schema alignment via MCP or Supabase dashboard

**Use Cases:**
- Pre-production testing
- Staging deployments from `staging` branch
- Integration testing with production-like data

### Prod Environment (TBD)

**Setup Steps:**
1. Create new Supabase project in Supabase dashboard
2. Note project ID and URL
3. Update this document with project details
4. Configure environment variables in Vercel:
   - Go to Vercel project settings → Environment Variables
   - Add all required variables for "Production" environment
5. Apply all migrations to prod project
6. Verify schema alignment via MCP or Supabase dashboard
7. Set up monitoring and alerts

**Use Cases:**
- Production deployments from `main` branch
- Live user traffic
- Production data

## Vercel Configuration

### Environment Variable Setup

1. **Navigate to Vercel Project Settings:**
   - Go to your Vercel project dashboard
   - Click "Settings" → "Environment Variables"

2. **Add Variables for Each Environment:**
   - **Production:** Variables used for `main` branch deployments
   - **Preview:** Variables used for all other branch deployments
   - **Development:** Variables used for `vercel dev` (optional)

3. **Required Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Optional, server-side only
   OPENAI_API_KEY=[openai-key]
   FIRECRAWL_API_KEY=[firecrawl-key]
   ADMIN_TOKEN=[secure-random-string]  # Optional
   ```

4. **Security Notes:**
   - `NEXT_PUBLIC_*` variables are exposed to the browser (safe for anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` should NEVER be exposed to browser
   - Use Vercel's environment variable encryption
   - Rotate keys periodically

### Deployment Configuration

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment-Specific Deployments:**
- Production: Deploys from `main` branch
- Preview: Deploys from all other branches
- Development: Local `vercel dev` uses `.env.local`

## Migration Execution

### Running Migrations

**Via Supabase MCP (Recommended):**
```bash
# Migrations are applied automatically via MCP during Phase 2
# Use Supabase MCP tools to apply migrations
```

**Via Supabase Dashboard:**
1. Go to Supabase project → SQL Editor
2. Copy migration SQL file contents
3. Paste and execute in SQL Editor
4. Verify execution success

**Via Supabase CLI (Alternative):**
```bash
# Install Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref [project-id]

# Apply migrations
supabase db push
```

### Migration Verification

**Check Applied Migrations:**
- Use Supabase MCP `list_migrations` tool
- Or check Supabase dashboard → Database → Migrations

**Verify Schema:**
- Use Supabase MCP `list_tables` tool
- Or check Supabase dashboard → Database → Tables

**Verify Extensions:**
- Use Supabase MCP `list_extensions` tool
- Or check Supabase dashboard → Database → Extensions

## Schema Verification Steps

After applying migrations, verify:

1. **Tables Exist:**
   - All 19 tables should exist in `public` schema
   - Check via MCP `list_tables` or Supabase dashboard

2. **Extensions Enabled:**
   - `vector` (v0.8.0) - Required for embeddings
   - `pgcrypto` (v1.3) - UUID generation
   - `uuid-ossp` (v1.1) - UUID generation
   - `pg_stat_statements` (v1.11) - Query monitoring

3. **Indexes Created:**
   - All performance indexes from `add_performance_indexes.sql` should exist
   - Check via Supabase dashboard → Database → Indexes

4. **RLS Policies Active:**
   - All tables should have RLS enabled
   - Policies should allow authenticated access
   - Check via MCP `execute_sql` querying `pg_policies`

5. **Functions Exist:**
   - `match_documents_for_system()` function should exist
   - Check via Supabase dashboard → Database → Functions

## Troubleshooting

### Connection Issues

**Error: "Missing Supabase environment variables"**
- Verify `.env.local` exists and contains required variables
- Restart dev server after adding variables
- Check variable names match exactly (case-sensitive)

**Error: "Invalid API key"**
- Verify keys are copied correctly (no extra spaces)
- Check project is not paused in Supabase dashboard
- Ensure using correct project's keys

### Migration Issues

**Error: "relation already exists"**
- Migrations use `IF NOT EXISTS` - should be safe to re-run
- Check if table structure matches expected schema
- Verify migration was partially applied

**Error: "extension does not exist"**
- Verify `vector` extension is available in Supabase project
- Some extensions require Pro plan
- Check Supabase dashboard → Database → Extensions

### Environment-Specific Issues

**Dev Environment:**
- Local `.env.local` takes precedence over Vercel env vars
- Clear `.next` cache if schema changes: `rm -rf .next`

**Vercel Deployments:**
- Verify environment variables are set for correct environment (Production/Preview)
- Check Vercel function logs for runtime errors
- Ensure build completes successfully

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Rotate keys periodically** - Especially service role key
3. **Use least privilege** - Anon key for client, service role only for server-side
4. **Monitor usage** - Check Supabase dashboard for unusual activity
5. **Enable RLS** - Always enable Row Level Security on tables
6. **Audit policies** - Review RLS policies regularly

## Firecrawl Configuration

### Environment Mapping

Firecrawl uses a single API key per environment. Currently, the same API key can be used across all environments, but you can configure environment-specific keys if needed.

| Environment | Firecrawl API Key Location | Configuration |
|------------|---------------------------|---------------|
| **Dev** | Local `.env.local` | `FIRECRAWL_API_KEY` |
| **Stage** | Vercel Preview environment variables | `FIRECRAWL_API_KEY` |
| **Prod** | Vercel Production environment variables | `FIRECRAWL_API_KEY` |

### Firecrawl Base URL

- **Default:** `https://api.firecrawl.dev`
- **Override:** Set `FIRECRAWL_BASE_URL` environment variable if using self-hosted or region-specific endpoints
- **Usage:** Currently not used in codebase (hardcoded to default), but supported for future flexibility

### Firecrawl Collections/Projects

- **Current:** No collections/projects are used in the current implementation
- **Future:** If Firecrawl introduces collection support, we can add `collectionId` parameter to crawl calls
- **v1 Strategy:** Single API key per environment, no collection separation needed

### Configuration Steps

1. **Local Development:**
   - Add `FIRECRAWL_API_KEY` to `.env.local`
   - Optional: Add `FIRECRAWL_BASE_URL` if using custom endpoint

2. **Vercel Deployment:**
   - Go to Vercel project settings → Environment Variables
   - Add `FIRECRAWL_API_KEY` for Production and Preview environments
   - Optional: Add `FIRECRAWL_BASE_URL` if needed

3. **Verification:**
   - Visit `/api/health` endpoint
   - Check that `firecrawlConfigured: true` is returned

See `docs/INGESTION_PLAN.md` for detailed Firecrawl integration and operational limits.

## Next Steps

1. ✅ Phase 1: Environment & Project Strategy (Complete)
2. ⏭️ Phase 2: Schema & Migration Plan
3. ⏭️ Phase 3: Auth, RLS, and Security Best Practices
4. ⏭️ Phase 4: Supabase Types & Client Configuration
5. ⏭️ Phase 5: Performance, Extensions, and Monitoring
6. ⏭️ Phase 6: Documentation & Checklists
7. ⏭️ Phase 7: Final Sanity & Validation

