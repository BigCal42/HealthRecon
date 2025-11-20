-- System profiles table
-- Migration: 20250101000009_system_profiles

create table if not exists system_profiles (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  summary jsonb not null, -- structured profile data
  created_at timestamptz default now()
);

