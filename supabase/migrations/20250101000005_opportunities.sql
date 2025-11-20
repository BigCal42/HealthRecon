-- Opportunities table
-- Migration: 20250101000005_opportunities

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open', -- 'open' | 'in_progress' | 'won' | 'lost' | 'closed'
  source_kind text,                    -- 'signal' | 'news' | 'chat' | 'manual'
  source_id uuid,                      -- optional reference to signals/documents/etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

