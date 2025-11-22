# BILH Bootstrap Guide

This guide explains how to bootstrap the Beth Israel Lahey Health (BILH) system in your local development environment.

## Prerequisites

Ensure the following environment variables are set in your `.env.local` file:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (required for seeding operations)

## Running the Seed Script

To create or update the BILH system and its seed URL:

```bash
npm run seed:bilh
```

This script is **idempotent** - it's safe to run multiple times. It will:

1. Create or update a `systems` row with:
   - `slug`: `"bilh"`
   - `name`: `"Beth Israel Lahey Health"`
   - `website`: `"https://bilh.org/"`
   - `hq_city`: `"Boston"`
   - `hq_state`: `"MA"`

2. Create or update a `system_seeds` row with:
   - `url`: `"https://bilh.org/"`
   - `label`: `"BILH Homepage"`
   - `active`: `true`
   - `priority`: `1`

## Expected Database State

After running the seed script, you should have:

- **1 row** in the `systems` table with slug `bilh`
- **1 row** in the `system_seeds` table pointing to `https://bilh.org/`

## Verification

After seeding, verify the system was created:

1. Visit [http://localhost:3000/systems](http://localhost:3000/systems) - you should see BILH listed
2. Visit [http://localhost:3000/systems/bilh](http://localhost:3000/systems/bilh) - you should see the system overview page

## Next Steps

Once the system is seeded, you can:

- Navigate to `/systems/bilh/ingestion` to manage seeds and trigger the ingestion pipeline
- Use the pipeline controls on the system page to start ingesting content
- Add additional seed URLs via the admin interface at `/admin/systems/bilh`

## Schema Reference

- `systems` table schema: See `supabase/migrations/20250101000001_initial_schema.sql`
- `system_seeds` table schema: See `supabase/migrations/20250101000015_system_seeds.sql`
- TypeScript types: Generated types are available in `lib/supabase.types.ts`

