# Vercel Deployment Guide for HealthRecon

This guide covers the complete deployment workflow for HealthRecon on Vercel, written for solo operators.

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Project**
   - Created and active
   - All migrations applied (20 migrations in `supabase/migrations/`)
   - `pgvector` extension enabled
   - RLS policies enabled on all tables

2. **OpenAI API Key**
   - Valid API key with access to `gpt-4.1-mini` and `text-embedding-3-small`
   - Sufficient credits/quota

3. **Firecrawl API Key**
   - Valid API key for web crawling
   - Sufficient quota

4. **GitHub Repository**
   - Code pushed to `BigCal42/HealthRecon`
   - `main` branch is production-ready

---

## Environment Variables Setup

### Step 1: Reference Environment Variables

See `docs/ENVIRONMENT_VERCEL.md` for the complete list of environment variables and their purposes.

### Step 2: Required Variables Checklist

**Minimum required for a fully functional deployment:**

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `OPENAI_API_KEY` - OpenAI API key for app runtime
- [ ] `FIRECRAWL_API_KEY` - Firecrawl API key

**Optional (but recommended):**

- [ ] `ADMIN_TOKEN` - For `/admin/*` routes (if using admin features)
- [ ] `SENTRY_DSN` - For error tracking (if using Sentry)

**Never set in Vercel:**

- [ ] `OPENAI_ADMIN_KEY` - Tooling only, never used by deployed app

### Step 3: Configure in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: `health-recon`
3. Navigate to **Settings** → **Environment Variables**
4. For each variable:
   - Click **Add New**
   - Enter exact name (case-sensitive)
   - Paste value
   - Select environment(s): **Production**, **Preview**, **Development** (as needed)
   - Click **Save**

**Important:** Set variables for the correct environments:
- **Production** = `main` branch deployments
- **Preview** = all other branch deployments
- **Development** = local development via Vercel CLI

---

## Local Dry Run

Before deploying to Vercel, verify everything works locally:

### Step 1: Setup Local Environment

```bash
# Clone repository (if not already done)
git clone https://github.com/BigCal42/HealthRecon.git
cd HealthRecon

# Install dependencies
npm install
```

### Step 2: Configure Local Environment Variables

```bash
# Copy example file (if it exists)
cp .env.example .env.local

# Edit .env.local and fill in all required values:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - FIRECRAWL_API_KEY
# - ADMIN_TOKEN (optional)
```

### Step 3: Run Pre-Deploy Checks

```bash
# Run the full pre-deploy pipeline (lint + type-check + build)
npm run predeploy
```

**Expected Result:**
- ✅ ESLint passes (no errors)
- ✅ TypeScript type-check passes (no errors)
- ✅ Build completes successfully

If any step fails, fix the issues before proceeding to Vercel deployment.

### Step 4: Verify Local Build

```bash
# Start production server locally
npm run build
npm run start

# Visit http://localhost:3000/api/health
# Should return:
# {
#   "ok": true,
#   "supabase": "ok",
#   "openaiConfigured": true,
#   "firecrawlConfigured": true
# }
```

---

## Vercel Deployment

### Step 1: Connect Repository (First Time Only)

If not already connected:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import `BigCal42/HealthRecon` from GitHub
4. Vercel will auto-detect Next.js framework
5. Click **Deploy**

### Step 2: Configure Project Settings

1. Go to **Settings** → **General**
2. Verify:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
   - **Root Directory:** (empty, project root)

3. Go to **Settings** → **Functions**
   - Verify **Node.js Version:** `20.x` (matches `package.json` engines)
   - Function timeout: 300 seconds (5 minutes) - appropriate for long-running pipelines

### Step 3: Set Environment Variables

Follow the steps in "Environment Variables Setup" above to add all required variables.

### Step 4: Deploy

**Automatic Deployment:**
- Push to `main` branch → triggers Production deployment
- Push to any other branch → triggers Preview deployment

**Manual Deployment:**
1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment
3. Or click **Create Deployment** → select branch → **Deploy**

### Step 5: Monitor Deployment

1. Watch build logs in real-time
2. Check for:
   - ✅ Build completes successfully
   - ✅ No environment variable errors
   - ✅ No TypeScript/ESLint errors
   - ✅ Deployment status: **Ready**

---

## Post-Deployment Verification

### Step 1: Health Check

Visit: `https://health-recon.vercel.app/api/health`

**Expected Response:**
```json
{
  "ok": true,
  "supabase": "ok",
  "openaiConfigured": true,
  "firecrawlConfigured": true,
  "timestamp": "2025-01-21T..."
}
```

If `ok: false` or any service shows as not configured, check:
- Environment variables are set correctly
- Variables are set for the correct environment (Production vs Preview)
- API keys are valid and not expired

### Step 2: Functional Tests

1. **Home Page:** `https://health-recon.vercel.app/`
   - Should load without errors

2. **Dashboard:** `https://health-recon.vercel.app/dashboard`
   - Should display systems list

3. **System Page:** `https://health-recon.vercel.app/systems/<slug>`
   - Should load system details
   - Chat should work (tests OpenAI + Supabase)

4. **API Routes:** Test key endpoints:
   - `/api/health` - Health check
   - `/api/systems` - Systems list
   - `/api/search` - Global search

### Step 3: Check Logs

1. Go to **Deployments** → [Latest Deployment] → **Logs**
2. Look for:
   - ✅ No runtime errors
   - ✅ Successful API calls
   - ✅ No missing environment variable errors

---

## Runtime Notes

### Node.js Runtime

**All API routes use Node.js runtime** (not Edge runtime):
- Explicitly set via `export const runtime = "nodejs"` in each route file
- Required for Supabase, OpenAI, and Firecrawl integrations
- Ensures compatibility with Node.js APIs and libraries

**Why Node.js runtime:**
- Supabase client requires Node.js environment
- OpenAI SDK requires Node.js APIs
- Firecrawl client uses Node.js HTTP libraries
- Long-running operations (pipelines, embeddings) benefit from Node.js runtime

**Edge runtime is not used** for API routes to avoid compatibility issues and reduce surprises.

### Function Configuration

- **Region:** `iad1` (US East - Washington, D.C.) - default
- **Timeout:** 300 seconds (5 minutes) - sufficient for long-running pipelines
- **Memory:** Standard - appropriate for most workloads
- **Concurrency:** Elastic - automatically scales

---

## Troubleshooting Deployment Failures

### Build Fails: "Environment variable validation failed"

**Symptoms:**
- Build logs show: `Environment variable validation failed: ...`
- Deployment status: **Error**

**Solution:**
1. Check Vercel → Settings → Environment Variables
2. Verify all required variables are set
3. Ensure variable names are exactly correct (case-sensitive)
4. Ensure variables are set for the correct environment (Production/Preview)
5. Redeploy after fixing

### Build Fails: TypeScript Errors

**Symptoms:**
- Build logs show TypeScript compilation errors
- Deployment status: **Error**

**Solution:**
1. Run `npm run type-check` locally to reproduce
2. Fix TypeScript errors in code
3. Commit and push fixes
4. Redeploy

### Build Fails: ESLint Errors

**Symptoms:**
- Build logs show ESLint errors
- Deployment status: **Error**

**Solution:**
1. Run `npm run lint` locally to reproduce
2. Fix ESLint errors (or add appropriate ignores)
3. Commit and push fixes
4. Redeploy

### Runtime Error: "OPENAI_API_KEY is required"

**Symptoms:**
- Health check shows `openaiConfigured: false`
- API routes return errors about missing OpenAI key

**Solution:**
1. Verify `OPENAI_API_KEY` is set in Vercel Environment Variables
2. Ensure it's set for the correct environment (Production/Preview)
3. Verify the key is valid (not expired, has correct permissions)
4. Redeploy after fixing

### Runtime Error: Supabase Connection Failed

**Symptoms:**
- Health check shows `supabase: "error"`
- API routes fail with Supabase errors

**Solution:**
1. Verify Supabase credentials are correct:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Check Supabase Dashboard to ensure project is active (not paused)
3. Verify RLS policies allow necessary operations
4. Check Supabase logs for specific error messages
5. Redeploy after fixing

### Deployment Succeeds but App Doesn't Work

**Symptoms:**
- Build completes successfully
- Deployment status: **Ready**
- But app returns errors or doesn't load

**Solution:**
1. Check runtime logs: Deployments → [Deployment] → Logs
2. Look for runtime errors (not build errors)
3. Verify environment variables are set correctly
4. Test `/api/health` endpoint to see which services are failing
5. Check Vercel function logs for specific error messages

---

## Common Deployment Scenarios

### Scenario 1: First-Time Deployment

1. ✅ Prerequisites met (Supabase, OpenAI, Firecrawl)
2. ✅ Code pushed to GitHub
3. ✅ Repository connected to Vercel
4. ✅ Environment variables configured
5. ✅ Push to `main` branch
6. ✅ Monitor deployment
7. ✅ Verify health check
8. ✅ Test key functionality

### Scenario 2: Update Existing Deployment

1. ✅ Make code changes locally
2. ✅ Run `npm run predeploy` to verify locally
3. ✅ Commit and push to `main` branch
4. ✅ Vercel automatically deploys
5. ✅ Monitor deployment logs
6. ✅ Verify health check after deployment

### Scenario 3: Deploy Feature Branch (Preview)

1. ✅ Create feature branch
2. ✅ Make changes
3. ✅ Run `npm run predeploy` locally
4. ✅ Push to feature branch
5. ✅ Vercel automatically creates Preview deployment
6. ✅ Test Preview URL
7. ✅ Merge to `main` when ready (triggers Production deployment)

### Scenario 4: Rollback to Previous Deployment

1. Go to Vercel → Deployments
2. Find previous successful deployment
3. Click **"..."** menu → **Promote to Production**
4. Confirm promotion
5. Previous deployment becomes active

---

## Maintenance Checklist

**Weekly:**
- [ ] Check deployment logs for errors
- [ ] Monitor OpenAI usage dashboard
- [ ] Review Supabase logs for unusual activity

**Monthly:**
- [ ] Review and rotate API keys if needed
- [ ] Update environment variables if credentials changed
- [ ] Check for Next.js/Node.js updates (test in Preview first)

**As Needed:**
- [ ] Add new environment variables when adding features
- [ ] Update Supabase migrations before deploying
- [ ] Test Preview deployments before merging to `main`

---

## Quick Reference

**Deployment URL:** `https://health-recon.vercel.app`

**Health Check:** `https://health-recon.vercel.app/api/health`

**Local Pre-Deploy:** `npm run predeploy`

**Vercel Dashboard:** https://vercel.com/dashboard

**Environment Variables:** Vercel → Settings → Environment Variables

**Deployment Logs:** Vercel → Deployments → [Deployment] → Logs

---

**Last Updated:** 2025-01-21  
**Maintained By:** HealthRecon Operations

