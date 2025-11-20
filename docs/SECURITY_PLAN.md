# Security Plan

## Overview

This document outlines the security architecture and secret management strategy for HealthRecon, with a focus on OpenAI key separation and secure integration patterns.

## OpenAI Key Strategy (APP vs ADMIN)

### Key Separation

HealthRecon uses **two distinct OpenAI API keys** with clearly separated roles:

#### 1. APP Key (`OPENAI_API_KEY`)

**Purpose:** Used by HealthRecon's runtime application (both Vercel production and local development).

**Used For:**
- Chat functionality
- RAG (Retrieval-Augmented Generation)
- System narratives
- Daily briefings
- Meeting prep
- System comparisons
- Signal actions
- All production AI features

**Storage:**
- **Local Dev:** `.env.local` (git-ignored)
- **Vercel:** Environment variables (encrypted)
- **Required:** Yes (app will not function without it)

**Access Pattern:**
- Read via `config.openai.apiKey` in server-side code only
- Never exposed to client-side code
- Never prefixed with `NEXT_PUBLIC_*`
- Used by `lib/openaiClient.ts` for all app runtime OpenAI calls

#### 2. ADMIN Key (`OPENAI_ADMIN_KEY`)

**Purpose:** Used ONLY for development tooling and Cursor MCP integration.

**Used For:**
- Cursor MCP OpenAI integration (when Cursor helps edit the repo)
- Local tooling scripts (e.g., config validation, prompt testing)
- Development-time analysis and optimization workflows
- **NOT used by the deployed app**

**Storage:**
- **Local Dev:** `.env.local` (git-ignored)
- **Vercel:** **NOT configured** (not needed by deployed app)
- **Required:** No (optional, only for development tooling)

**Access Pattern:**
- Read via `config.openaiAdmin.apiKey` (may be `null`)
- **NEVER** imported or used in:
  - Route handlers (`/app/api/*`)
  - Server components that render to client
  - Any code that runs in production app runtime
  - Browser bundles

### Security Boundaries

#### What Must NEVER Happen

1. **No client-side exposure:**
   - Neither key must be prefixed with `NEXT_PUBLIC_*`
   - Neither key must be accessible in browser/client components
   - Neither key must be logged or exposed in API responses

2. **No admin key in app runtime:**
   - `config.openaiAdmin.apiKey` must never be used in route handlers
   - `config.openaiAdmin.apiKey` must never be used in production code paths
   - Admin key is only for tooling scripts and Cursor MCP

3. **No secrets in code:**
   - No hardcoded API keys in source files
   - No keys in `.env.example` (only placeholders)
   - No keys committed to git

4. **No secrets in logs:**
   - Environment variable values must never be logged
   - API request headers containing keys must never be logged
   - Error messages must not expose key values

### Implementation Details

#### Config Module (`lib/config.ts`)

The config module enforces key separation:

```typescript
export const config = {
  // Legacy flat structure (backward compatible)
  OPENAI_API_KEY: string,
  OPENAI_ADMIN_KEY?: string,
  
  // Structured access (preferred)
  openai: {
    apiKey: string,  // APP key - required
  },
  openaiAdmin: {
    apiKey: string | null,  // ADMIN key - optional, tooling only
  },
};
```

**Usage Guidelines:**
- App code: Use `config.openai.apiKey`
- Tooling scripts: Use `config.openaiAdmin.apiKey` (with null checks)
- Never mix: App code must never use `config.openaiAdmin.apiKey`

#### OpenAI Client (`lib/openaiClient.ts`)

The OpenAI client wrapper uses only the APP key:

```typescript
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: config.openai.apiKey,  // Always APP key
    // ...
  });
}
```

This ensures all app runtime OpenAI calls use the correct key.

## Environment Variable Management

### Local Development

**File:** `.env.local` (git-ignored)

```bash
# Required for app runtime
OPENAI_API_KEY=sk-proj-...

# Optional, for Cursor MCP and tooling only
OPENAI_ADMIN_KEY=sk-admin-...
```

### Vercel Deployment

**Production/Preview/Development Environments:**

- `OPENAI_API_KEY`: ✅ Required (encrypted)
- `OPENAI_ADMIN_KEY`: ❌ Not configured (not needed by deployed app)

### Validation

All environment variables are validated at startup via Zod schema in `lib/config.ts`:
- `OPENAI_API_KEY`: Required (app will fail to start without it)
- `OPENAI_ADMIN_KEY`: Optional (app runs fine without it)

## Secret Exposure Prevention

### Code Review Checklist

When reviewing code changes, ensure:

- [ ] No `NEXT_PUBLIC_OPENAI_*` variables
- [ ] No hardcoded API keys
- [ ] No `console.log(process.env.OPENAI_*)` statements
- [ ] No admin key usage in route handlers
- [ ] All OpenAI calls use `config.openai.apiKey` (not admin key)
- [ ] No keys in error messages or API responses

### Automated Checks

Run before committing:

```bash
# Search for potential secret leaks
grep -r "OPENAI.*KEY" --exclude-dir=node_modules --exclude="*.test.ts" .
grep -r "sk-proj\|sk-admin" --exclude-dir=node_modules .
grep -r "NEXT_PUBLIC_OPENAI" --exclude-dir=node_modules .

# Verify no keys in built output
npm run build
grep -r "sk-" .next/ || echo "No keys found in build"
```

## Related Documentation

- `docs/CURSOR_PLAN.md` - Cursor MCP OpenAI integration
- `docs/OPENAI_TUNING_WORKFLOW.md` - Optimization workflows using admin key
- `docs/VERCEL_PLAN.md` - Vercel environment variable setup

