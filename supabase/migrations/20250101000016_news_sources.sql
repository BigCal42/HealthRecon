-- News sources table
-- Migration: 20250101000016_news_sources

create table if not exists news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

insert into news_sources (name, url)
values
  ('Beckers', 'https://www.beckershospitalreview.com'),
  ('Healthcare Dive', 'https://www.healthcaredive.com'),
  ('Modern Healthcare', 'https://www.modernhealthcare.com')
on conflict do nothing;

