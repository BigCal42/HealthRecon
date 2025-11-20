-- Harden search_path and schema-qualify references for match_documents_for_system
-- Migration: 20250219000100_harden_match_documents_search_path
--
-- This migration addresses the Supabase Advisor warning about mutable search_path
-- on public.match_documents_for_system. By explicitly setting search_path and
-- schema-qualifying all table references, we ensure the function behavior is
-- stable regardless of the caller's search_path setting.
--
-- Behavior is unchanged aside from hardening against search_path mutations.

create or replace function public.match_documents_for_system(
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
stable
set search_path = public, extensions
as $$
  select
    d.id,
    d.system_id,
    d.source_url,
    d.title,
    d.raw_text,
    1 - (de.embedding <=> query_embedding) as similarity
  from public.document_embeddings de
  join public.documents d on d.id = de.document_id
  where d.system_id = system_id
  order by de.embedding <=> query_embedding
  limit match_count;
$$;

