create table if not exists system_narratives (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  narrative jsonb not null,        -- structured narrative JSON
  created_at timestamptz default now()
);

