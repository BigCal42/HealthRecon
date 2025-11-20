# Environment Variables for Vercel Deployment

This document describes all environment variables used by HealthRecon and how to configure them in Vercel.

## Overview

HealthRecon uses environment variables for:
- Supabase database connection and authentication
- OpenAI API for LLM operations and embeddings
- Firecrawl API for web crawling and ingestion
- Admin authentication (optional)
- Internal API protection (optional)
- Error tracking via Sentry (optional)

All environment variables are validated at runtime via Zod (`lib/config.ts`). The app will fail fast with clear error messages if required variables are missing.

---

## Required Environment Variables

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type:** Public (exposed to browser)
- **Required:** Yes
- **Format:** `https://<project-ref>.supabase.co`
- **Usage:** Supabase client initialization (browser and server)
- **Example:** `https://xyzabc123.supabase.co`
- **Where to find:** Supabase Dashboard → Project Settings → API → Project URL

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type:** Public (exposed to browser)
- **Required:** Yes
- **Format:** Long JWT token string
- **Usage:** Supabase client authentication (browser and server)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type:** Server-only (never exposed to browser)
- **Required:** Yes
- **Format:** Long JWT token string
- **Usage:** Server-side operations requiring elevated permissions (rate limiting, admin operations)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Project Settings → API → Project API keys → `service_role` `secret`
- **Security:** ⚠️ Keep this secret. Never commit to version control or expose to client-side code.

### OpenAI Configuration

#### `OPENAI_API_KEY`
- **Type:** Server-only
- **Required:** Yes
- **Format:** `sk-...` API key string
- **Usage:** Used by app runtime for:
  - RAG chat (`/api/chat`)
  - Daily briefings (`/api/daily-briefing`)
  - Sales briefings (`/api/sales-briefing`)
  - System profiles (`/api/system-profile`)
  - System narratives (`/api/system-narrative`)
  - Meeting prep (`/api/meeting-prep`)
  - Account plans (`/api/account-plan`)
  - Signal actions (`/api/signal-actions`)
  - Outbound drafts (`/api/outbound-draft`)
  - Opportunity suggestions (`/api/opportunity-suggestions`)
  - System comparisons (`/api/compare`, `/api/compare-systems`)
  - Document embeddings (`/api/embed`)
  - Processing pipeline (`/api/process`, `/api/pipeline`)
- **Example:** `sk-proj-abc123...`
- **Where to find:** OpenAI Dashboard → API Keys → Create new secret key
- **Security:** ⚠️ Keep this secret. Never commit to version control or expose to client-side code.

### Firecrawl Configuration

#### `FIRECRAWL_API_KEY`
- **Type:** Server-only
- **Required:** Yes
- **Format:** API key string
- **Usage:** Web crawling and ingestion:
  - System ingestion (`/api/ingest`)
  - News ingestion (`/api/news-ingest`)
  - Pipeline operations (`/api/pipeline`)
- **Example:** `fc-abc123...`
- **Where to find:** Firecrawl Dashboard → API Keys
- **Security:** ⚠️ Keep this secret. Never commit to version control or expose to client-side code.

---

## Optional Environment Variables

### Firecrawl Configuration

#### `FIRECRAWL_BASE_URL`
- **Type:** Server-only
- **Required:** No
- **Default:** `https://api.firecrawl.dev`
- **Format:** Base URL string
- **Usage:** Firecrawl API base URL (only override if using custom endpoint)
- **Example:** `https://api.firecrawl.dev`

### Admin Authentication

#### `ADMIN_TOKEN`
- **Type:** Server-only
- **Required:** No (only needed if using `/admin/*` routes)
- **Format:** Secure random string
- **Usage:** Admin route authentication (`/admin/login`, `/admin/systems`, `/admin/system-seeds`)
- **Example:** `your-secure-random-token-here`
- **Security:** ⚠️ Use a strong, random token. Never commit to version control.

### Internal API Protection

#### `INTERNAL_API_KEY`
- **Type:** Server-only
- **Required:** No (only needed if protecting internal routes)
- **Format:** Secure random string
- **Usage:** Internal API route protection (`/api/ingest`, `/api/pipeline`, `/api/embed`)
- **Example:** `your-secure-random-token-here`
- **Security:** ⚠️ Use a strong, random token. Never commit to version control.

### OpenAI Admin Key (Tooling Only)

#### `OPENAI_ADMIN_KEY`
- **Type:** Server-only
- **Required:** No
- **Format:** `sk-...` API key string
- **Usage:** **ONLY** for Cursor MCP and local tooling scripts. **NEVER** used by deployed app.
- **Example:** `sk-proj-xyz789...`
- **Security:** ⚠️ This key is for development tooling only. Never used in production app runtime.

### Error Tracking

#### `SENTRY_DSN`
- **Type:** Server-only
- **Required:** No
- **Format:** Sentry DSN URL
- **Usage:** Error tracking and monitoring (if Sentry is configured)
- **Example:** `https://abc123@o123456.ingest.sentry.io/123456`
- **Where to find:** Sentry Dashboard → Project Settings → Client Keys (DSN)

### Node Environment

#### `NODE_ENV`
- **Type:** Server-only
- **Required:** No
- **Default:** `development`
- **Format:** `development` | `production` | `test`
- **Usage:** Environment detection (logging, feature flags)
- **Note:** Vercel automatically sets this to `production` for production deployments.

---

## Configuring Environment Variables in Vercel

### Step 1: Access Environment Variables Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`health-recon`)
3. Navigate to **Settings** → **Environment Variables**

### Step 2: Add Variables

For each environment variable:

1. Click **Add New**
2. Enter the **Name** (exactly as listed above, case-sensitive)
3. Enter the **Value** (paste the actual value)
4. Select the **Environment(s)** where this variable applies:
   - **Production** - Used in production deployments (`main` branch)
   - **Preview** - Used in preview deployments (all other branches)
   - **Development** - Used in local development (via Vercel CLI)
5. Click **Save**

### Step 3: Environment-Specific Configuration

**Recommended Setup:**

- **Production Environment:**
  - All required variables (Supabase, OpenAI, Firecrawl)
  - Production Supabase project credentials (if separate from dev)
  - `ADMIN_TOKEN` (if admin features are needed)
  - `SENTRY_DSN` (if error tracking is enabled)

- **Preview Environment:**
  - All required variables (Supabase, OpenAI, Firecrawl)
  - Dev Supabase project credentials (for testing)
  - `ADMIN_TOKEN` (optional, for testing admin features)

- **Development Environment:**
  - All required variables (Supabase, OpenAI, Firecrawl)
  - Dev Supabase project credentials
  - `OPENAI_ADMIN_KEY` (for local tooling, if needed)
  - `ADMIN_TOKEN` (optional)

### Step 4: Verify Configuration

After adding variables:

1. **Redeploy** your project (or push a new commit) to apply changes
2. Check deployment logs to ensure no environment variable errors
3. Visit `/api/health` endpoint to verify all services are configured:
   ```json
   {
     "ok": true,
     "supabase": "ok",
     "openaiConfigured": true,
     "firecrawlConfigured": true
   }
   ```

---

## Environment Variable Scopes

### Public Variables (`NEXT_PUBLIC_*`)

Variables prefixed with `NEXT_PUBLIC_` are:
- Exposed to the browser
- Bundled into client-side JavaScript
- Safe to expose (they are designed to be public)

**Public Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server-Only Variables

Variables without the `NEXT_PUBLIC_` prefix are:
- Only available on the server
- Never exposed to the browser
- Never bundled into client-side code

**Server-Only Variables:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ADMIN_KEY`
- `FIRECRAWL_API_KEY`
- `FIRECRAWL_BASE_URL`
- `ADMIN_TOKEN`
- `INTERNAL_API_KEY`
- `SENTRY_DSN`
- `NODE_ENV`

---

## Build-Time vs Runtime Behavior

### Build-Time (Next.js Build Phase)

During `next build`:
- Environment variables may not be available
- `lib/config.ts` provides safe placeholder values to allow the build to complete
- No validation errors are thrown during build

### Runtime (Production/Preview Deployments)

During actual request handling:
- All environment variables must be present and valid
- `lib/config.ts` validates all variables via Zod
- Missing or invalid variables cause the app to fail fast with clear error messages

**Important:** The build-time placeholder behavior does NOT mask missing env vars at runtime. The app will fail with clear errors if required variables are missing when handling real requests.

---

## Security Best Practices

1. **Never commit secrets to version control**
   - Use `.env.local` for local development (already in `.gitignore`)
   - Use Vercel Environment Variables for deployments

2. **Use separate Supabase projects for Production vs Preview/Dev**
   - Production should use a production Supabase project
   - Preview/Dev can share a dev Supabase project

3. **Rotate keys regularly**
   - Periodically rotate API keys and tokens
   - Update Vercel environment variables when rotating

4. **Use strong tokens for admin/internal routes**
   - Generate secure random strings for `ADMIN_TOKEN` and `INTERNAL_API_KEY`
   - Use tools like `openssl rand -hex 32` or online generators

5. **Monitor usage**
   - Check OpenAI usage dashboard regularly
   - Monitor Firecrawl API usage
   - Review Supabase logs for unusual activity

---

## Troubleshooting

### Build Fails with "Environment variable validation failed"

**Cause:** Missing or invalid environment variable during build.

**Solution:**
1. Check Vercel Environment Variables settings
2. Ensure all required variables are set for the correct environment
3. Verify variable names are exactly correct (case-sensitive)
4. Redeploy after fixing

### Runtime Error: "OPENAI_API_KEY is required"

**Cause:** `OPENAI_API_KEY` is missing or not set for the deployment environment.

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Add `OPENAI_API_KEY` for the correct environment (Production/Preview)
3. Redeploy the project

### Health Check Shows `openaiConfigured: false`

**Cause:** `OPENAI_API_KEY` is not set or is invalid.

**Solution:**
1. Verify `OPENAI_API_KEY` is set in Vercel Environment Variables
2. Check that the key is valid (not expired, has correct permissions)
3. Ensure the variable is set for the correct environment
4. Redeploy after fixing

### Supabase Connection Errors

**Cause:** Supabase credentials are incorrect or project is paused.

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Check Supabase Dashboard to ensure project is active
3. Verify RLS policies allow necessary operations
4. Check Supabase logs for specific error messages

---

## Quick Reference Checklist

**Required for Production:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `FIRECRAWL_API_KEY`

**Optional (but recommended):**
- [ ] `ADMIN_TOKEN` (if using admin features)
- [ ] `SENTRY_DSN` (if using error tracking)

**Never set in Production:**
- [ ] `OPENAI_ADMIN_KEY` (tooling only, never used by deployed app)

---

**Last Updated:** 2025-01-21  
**Maintained By:** HealthRecon Operations

