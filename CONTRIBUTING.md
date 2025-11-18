# Contributing to HealthRecon

Thank you for your interest in contributing to HealthRecon! This guide will help you get started.

## Development Setup

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
   ```
   Fill in all required values in `.env.local` before continuing.

4. **Provision Supabase schema**
   Run each SQL file inside `supabase/` via the Supabase SQL editor (in order):
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

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Branching and Commits

- **Default branch:** `main`
- **Branch naming:** Use short, descriptive branch names (e.g., `feature/system-profiles`, `chore/ci`, `fix/null-signals`)
- **Commit messages:** Use conventional commit format with a type prefix:
  - `feat: add opportunity suggestions`
  - `chore: update health check`
  - `fix: handle null signals in profile`
  - `docs: update README setup instructions`

## Quality Checks Before Push

Always run these commands before pushing your changes:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

The CI pipeline enforces this exact sequence (lint → type-check → test → build) on every push and pull request, so catching issues locally saves time.

## Code Style

- **TypeScript first:** Prefer explicit types over `any`. Use TypeScript's type system to catch errors early.
- **Component structure:** Keep components small and focused. Each component should have a single responsibility.
- **Server vs. client:** Keep server-only logic in `lib/` and API routes (`app/api/`). Use client components (`'use client'`) only when interactivity is required.
- **Simplicity:** Avoid unnecessary abstractions. Prefer simple functions over classes when possible.
- **Environment variables:** Use explicit checks and fail fast for missing required environment keys.

