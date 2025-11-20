-- Opportunity suggestions table
-- Migration: 20250101000013_opportunity_suggestions

create table if not exists opportunity_suggestions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  title text not null,
  description text,
  source_kind text not null,
  source_ids uuid[] default '{}',
  created_at timestamptz default now(),
  accepted boolean not null default false,
  accepted_opportunity_id uuid
);

