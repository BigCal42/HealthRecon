create extension if not exists pgcrypto;

create table if not exists systems (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  website text,
  hq_city text,
  hq_state text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  system_id uuid references systems(id) on delete cascade,
  source_url text not null,
  source_type text not null,
  title text,
  raw_text text,
  hash text not null,
  processed boolean not null default false,
  crawled_at timestamptz default now()
);

create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  system_id uuid references systems(id) on delete cascade,
  type text not null,
  name text not null,
  role text,
  attributes jsonb,
  source_document_id uuid references documents(id),
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  system_id uuid references systems(id) on delete cascade,
  document_id uuid references documents(id),
  severity text not null,
  category text not null,
  summary text not null,
  details jsonb,
  created_at timestamptz default now()
);

create unique index if not exists documents_system_hash_idx
  on documents (system_id, hash);

-- If documents already exists, run these statements in Supabase:
-- alter table documents add column if not exists hash text;
-- alter table documents add column if not exists processed boolean not null default false;

insert into systems (slug, name, website)
values ('bilh', 'Beth Israel Lahey Health', 'https://bilh.org')
on conflict (slug) do nothing;
