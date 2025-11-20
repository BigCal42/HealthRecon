-- Enhance opportunities table for pipeline management
-- Migration: 20250101000023_enhance_opportunities_pipeline

-- Stage: text enum-like field (we'll enforce values in app code)
alter table opportunities
  add column if not exists stage text;

-- Amount + currency
alter table opportunities
  add column if not exists amount numeric(14,2),
  add column if not exists currency text;

-- Close date
alter table opportunities
  add column if not exists close_date date;

-- Probability (0–100)
alter table opportunities
  add column if not exists probability integer;

-- Priority (for ordering in board columns)
alter table opportunities
  add column if not exists priority integer;

-- Indexes to support board queries
create index if not exists opportunities_system_stage_idx
  on opportunities (system_id, stage);

create index if not exists opportunities_close_date_idx
  on opportunities (close_date);

