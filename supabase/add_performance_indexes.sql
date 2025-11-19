-- Performance indexes for frequently queried fields
-- Run this migration after all other schema files

-- Documents table indexes
create index if not exists documents_system_id_idx on documents (system_id);
create index if not exists documents_source_type_idx on documents (source_type);
create index if not exists documents_processed_idx on documents (processed);
create index if not exists documents_crawled_at_idx on documents (crawled_at);

-- Signals table indexes
create index if not exists signals_system_id_idx on signals (system_id);
create index if not exists signals_severity_idx on signals (severity);
create index if not exists signals_category_idx on signals (category);
create index if not exists signals_created_at_idx on signals (created_at);
create index if not exists signals_document_id_idx on signals (document_id);

-- Entities table indexes
create index if not exists entities_system_id_idx on entities (system_id);
create index if not exists entities_type_idx on entities (type);
create index if not exists entities_created_at_idx on entities (created_at);

-- Opportunities table indexes
create index if not exists opportunities_system_id_idx on opportunities (system_id);
create index if not exists opportunities_status_idx on opportunities (status);
create index if not exists opportunities_created_at_idx on opportunities (created_at);
create index if not exists opportunities_updated_at_idx on opportunities (updated_at);

-- Contacts table indexes
create index if not exists contacts_system_id_idx on contacts (system_id);
create index if not exists contacts_is_primary_idx on contacts (is_primary);
create index if not exists contacts_created_at_idx on contacts (created_at);

-- Interactions table indexes
create index if not exists interactions_system_id_idx on interactions (system_id);
create index if not exists interactions_occurred_at_idx on interactions (occurred_at);
create index if not exists interactions_next_step_due_at_idx on interactions (next_step_due_at) where next_step_due_at is not null;
create index if not exists interactions_created_at_idx on interactions (created_at);

-- Signal actions table indexes
create index if not exists signal_actions_system_id_idx on signal_actions (system_id);
create index if not exists signal_actions_signal_id_idx on signal_actions (signal_id);
create index if not exists signal_actions_created_at_idx on signal_actions (created_at);

-- System profiles table indexes
create index if not exists system_profiles_system_id_idx on system_profiles (system_id);
create index if not exists system_profiles_created_at_idx on system_profiles (created_at);

-- Daily briefings table indexes
create index if not exists daily_briefings_system_id_idx on daily_briefings (system_id);
create index if not exists daily_briefings_created_at_idx on daily_briefings (created_at);

-- Sales briefings table indexes (if exists)
create index if not exists sales_briefings_generated_for_date_idx on sales_briefings (generated_for_date);
create index if not exists sales_briefings_created_at_idx on sales_briefings (created_at);

-- System narratives table indexes (if exists)
create index if not exists system_narratives_system_id_idx on system_narratives (system_id);
create index if not exists system_narratives_created_at_idx on system_narratives (created_at);

-- Account plans table indexes (if exists)
create index if not exists account_plans_system_id_idx on account_plans (system_id);
create index if not exists account_plans_created_at_idx on account_plans (created_at);

-- Opportunity suggestions table indexes (if exists)
create index if not exists opportunity_suggestions_system_id_idx on opportunity_suggestions (system_id);
create index if not exists opportunity_suggestions_accepted_idx on opportunity_suggestions (accepted);
create index if not exists opportunity_suggestions_created_at_idx on opportunity_suggestions (created_at);

-- Outbound playbooks table indexes (if exists)
create index if not exists outbound_playbooks_system_id_idx on outbound_playbooks (system_id);
create index if not exists outbound_playbooks_created_at_idx on outbound_playbooks (created_at);

-- System seeds table indexes
create index if not exists system_seeds_system_id_idx on system_seeds (system_id);
create index if not exists system_seeds_active_idx on system_seeds (active);
create index if not exists system_seeds_created_at_idx on system_seeds (created_at);

-- News sources table indexes (if exists)
create index if not exists news_sources_active_idx on news_sources (active);

-- Document embeddings table indexes (if exists)
create index if not exists document_embeddings_document_id_idx on document_embeddings (document_id);

-- Run logs table indexes (if exists)
create index if not exists run_logs_system_id_idx on run_logs (system_id);
create index if not exists run_logs_run_type_idx on run_logs (run_type);
create index if not exists run_logs_created_at_idx on run_logs (created_at);

-- Feedback table indexes (if exists)
create index if not exists feedback_system_id_idx on feedback (system_id);
create index if not exists feedback_created_at_idx on feedback (created_at);

-- Systems table indexes (additional)
create index if not exists systems_created_at_idx on systems (created_at);
create index if not exists systems_updated_at_idx on systems (updated_at);

