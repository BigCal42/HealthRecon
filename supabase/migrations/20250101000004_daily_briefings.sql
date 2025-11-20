-- Daily briefings table
-- Migration: 20250101000004_daily_briefings

create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  system_id uuid references systems(id) on delete cascade,
  summary text not null,
  created_at timestamptz default now()
);

