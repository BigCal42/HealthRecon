-- Account plans table
-- Migration: 20250101000008_account_plans

create table if not exists account_plans (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  summary jsonb not null,   -- structured account plan JSON
  created_at timestamptz default now()
);

