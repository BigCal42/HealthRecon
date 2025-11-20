-- System seeds table
-- Migration: 20250101000015_system_seeds

create table if not exists system_seeds (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete cascade,
  url text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

insert into system_seeds (system_id, url)
select id, 'https://bilh.org'
from systems
where slug = 'bilh'
on conflict do nothing;

