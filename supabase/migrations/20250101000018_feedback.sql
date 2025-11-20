-- Feedback table
-- Migration: 20250101000018_feedback

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  kind text not null, -- 'chat' | 'signal' | 'briefing'
  target_id uuid,     -- e.g. for 'chat', a response id (we'll use a generated uuid client-side)
  sentiment text not null, -- 'up' | 'down'
  comment text,
  created_at timestamptz default now()
);

