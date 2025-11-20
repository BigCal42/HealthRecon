-- Sales briefings table
-- Migration: 20250101000012_sales_briefings

create table if not exists sales_briefings (
  id uuid primary key default gen_random_uuid(),
  generated_for_date date not null,     -- e.g. 2025-01-21
  summary jsonb not null,               -- structured JSON briefing
  created_at timestamptz default now()
);

