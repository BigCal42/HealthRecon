-- Document embeddings table and vector search function
-- Migration: 20250101000003_document_embeddings

create table if not exists document_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz default now(),
  unique (document_id)
);

create or replace function match_documents_for_system(
  query_embedding vector(1536),
  system_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  system_id uuid,
  source_url text,
  title text,
  raw_text text,
  similarity float
)
language sql
as $$
  select
    d.id,
    d.system_id,
    d.source_url,
    d.title,
    d.raw_text,
    1 - (de.embedding <=> query_embedding) as similarity
  from document_embeddings de
  join documents d on d.id = de.document_id
  where d.system_id = system_id
  order by de.embedding <=> query_embedding
  limit match_count;
$$;

