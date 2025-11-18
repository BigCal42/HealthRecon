create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  channel text not null,          -- 'email' | 'call' | 'meeting' | 'linkedin' | 'other'
  subject text,                   -- short subject/label
  summary text,                   -- what happened
  next_step text,                 -- optional: what to do next
  next_step_due_at timestamptz,   -- optional: when it's due
  created_at timestamptz default now()
);

