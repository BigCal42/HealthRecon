# Supabase Database Hardening

**Last Updated:** 2025-02-19

This document tracks database hardening improvements based on Supabase Advisor recommendations and security best practices.

## 1. Function search_path Hardening

### Issue
The `public.match_documents_for_system` function previously relied on an implicit `search_path`, which Supabase Advisor flagged as a security risk. If a caller's `search_path` is mutated, the function could resolve table names incorrectly, leading to unexpected behavior or potential security issues.

### Resolution
Migration `20250219000100_harden_match_documents_search_path.sql` updates the function to:

- **Schema-qualify all table references**: All table references (`public.document_embeddings`, `public.documents`) are now explicitly qualified
- **Set fixed search_path**: The function now includes `SET search_path = public, extensions` at the function level, ensuring consistent behavior regardless of the caller's `search_path` setting
- **Preserve behavior**: The function signature, return type, and query logic remain unchanged

This change reduces the risk from role-mutated `search_path` settings and aligns with Supabase Advisor guidance for production database hardening.

## 2. Foreign Key Index on entities.source_document_id

### Issue
Supabase Advisor flagged `entities.source_document_id` as lacking an index, despite being a foreign key column. Unindexed foreign keys can lead to poor query performance when filtering or joining by that column.

### Resolution
Migration `20250219000200_entities_source_document_fk_index.sql` adds the missing index:

- **Index name**: `entities_source_document_id_idx`
- **Creation method**: `CREATE INDEX CONCURRENTLY` to avoid blocking writes during index creation
- **Idempotent**: The migration checks for index existence before creating, making it safe to re-run

This index supports the foreign key relationship and improves query performance when filtering or joining by `source_document_id`.

## 3. Vector Extension in `public` Schema

### Current State
The `vector` extension is currently installed in the `public` schema. Supabase Advisor recommends moving extensions out of `public` for stricter security hardening.

### Future Plan

We are currently choosing **Option B (short/medium-term)** for simplicity:

- **Keep `vector` in `public`** for now
- **Restrict `CREATE` and `USAGE`** on `public` to trusted roles in Supabase
- **Continue to rely on RLS** and principle of least-privilege access

**Option A (long-term)** would involve migrating the extension to a dedicated schema:

1. Create dedicated schema: `CREATE SCHEMA IF NOT EXISTS extensions;`
2. Move extension: `CREATE EXTENSION vector WITH SCHEMA extensions;`
3. Verify all `vector`-typed columns and indexes continue to work as expected
4. Update any type references if necessary (e.g., `extensions.vector` vs `vector`)
5. Drop the extension from `public` once fully migrated: `DROP EXTENSION vector;`

**When to consider Option A:**
- If we need stricter schema separation for compliance or security requirements
- If we add more extensions that would benefit from centralized management
- During a planned maintenance window when we can test the migration thoroughly

For now, Option B provides adequate security while maintaining simplicity and avoiding potential migration risks.

## 4. Index Hygiene Plan

### Current State
Supabase Advisor has noted "many unused indexes" in the database. We are **not dropping any indexes yet** to avoid potential performance regressions.

### Monitoring Plan

1. **Enable monitoring**: The `pg_stat_statements` extension is already installed and can be used to track query patterns
2. **Observe index usage**: Monitor index usage for 7-14 days using PostgreSQL's built-in statistics
3. **Evaluate before dropping**: Only consider dropping clearly-unused, non-constraint indexes after confirming they are not needed

### Index Usage Query Example

To check index usage statistics:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

Indexes with `idx_scan = 0` over an extended period (7-14 days) may be candidates for removal, but only after:
- Confirming they are not constraint indexes (PRIMARY KEY, UNIQUE, FOREIGN KEY)
- Verifying they are not used by infrequent but critical queries
- Testing in a non-production environment first

### Future Actions

- After monitoring period, create a migration to drop unused indexes using `DROP INDEX CONCURRENTLY`
- Document any index removals in this file with rationale

