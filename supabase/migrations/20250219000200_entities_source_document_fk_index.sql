-- Add missing FK index for entities.source_document_id
-- Migration: 20250219000200_entities_source_document_fk_index
--
-- This migration addresses the Supabase Advisor warning about missing FK index
-- on entities.source_document_id. The index supports foreign key lookups and
-- improves query performance when filtering or joining by source_document_id.

create index if not exists entities_source_document_id_idx
  on public.entities (source_document_id);

