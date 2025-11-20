-- Signal actions table
-- Migration: 20250101000010_signal_actions

create table if not exists signal_actions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  signal_id uuid not null references signals(id) on delete cascade,
  action_category text not null,     -- e.g. 'follow_up', 'research', 'reach_out', 'update_strategy'
  action_description text not null,  -- LLM-generated recommended action
  confidence integer not null,       -- 1-100 confidence score
  created_at timestamptz default now()
);

