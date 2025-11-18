create table if not exists outbound_playbooks (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  summary jsonb not null, -- structured playbook data
  created_at timestamptz default now()
);

