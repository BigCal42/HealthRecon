-- Add optional fields to system_seeds table
-- Migration: 20250101000024_add_seed_fields

alter table system_seeds
  add column if not exists label text,
  add column if not exists priority integer,
  add column if not exists last_crawled_at timestamptz;

create index if not exists system_seeds_system_id_priority_idx
  on system_seeds (system_id, priority);

