create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  status text not null, -- 'success' | 'error'
  ingest_created int default 0,
  process_processed int default 0,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists daily_briefing_runs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  status text not null, -- 'success' | 'error' | 'no_recent_activity'
  briefing_id uuid,     -- references daily_briefings(id) but no FK needed for simplicity
  error_message text,
  created_at timestamptz default now()
);

