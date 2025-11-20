-- Enable Row Level Security (RLS) and create policies for all tables
-- Migration: 20250101000020_enable_rls_policies
--
-- Strategy:
-- - V1 (Current): Simple authenticated user access (read/write) for single-user/low-user scenario
-- - Future: Multi-user/org support will require adding user_id/org_id columns and updating policies
--
-- Note: Service role key bypasses RLS, so server-side operations using service role
-- will have full access regardless of these policies.

-- Enable RLS on all tables
alter table systems enable row level security;
alter table documents enable row level security;
alter table entities enable row level security;
alter table signals enable row level security;
alter table document_embeddings enable row level security;
alter table daily_briefings enable row level security;
alter table opportunities enable row level security;
alter table contacts enable row level security;
alter table interactions enable row level security;
alter table account_plans enable row level security;
alter table system_profiles enable row level security;
alter table signal_actions enable row level security;
alter table system_narratives enable row level security;
alter table sales_briefings enable row level security;
alter table opportunity_suggestions enable row level security;
alter table outbound_playbooks enable row level security;
alter table system_seeds enable row level security;
alter table news_sources enable row level security;
alter table pipeline_runs enable row level security;
alter table daily_briefing_runs enable row level security;
alter table feedback enable row level security;

-- Policies for systems table
create policy "Authenticated users can read systems"
  on systems for select
  to authenticated
  using (true);

create policy "Authenticated users can insert systems"
  on systems for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update systems"
  on systems for update
  to authenticated
  using (true);

create policy "Authenticated users can delete systems"
  on systems for delete
  to authenticated
  using (true);

-- Policies for documents table
create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (true);

create policy "Authenticated users can insert documents"
  on documents for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update documents"
  on documents for update
  to authenticated
  using (true);

create policy "Authenticated users can delete documents"
  on documents for delete
  to authenticated
  using (true);

-- Policies for entities table
create policy "Authenticated users can read entities"
  on entities for select
  to authenticated
  using (true);

create policy "Authenticated users can insert entities"
  on entities for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update entities"
  on entities for update
  to authenticated
  using (true);

create policy "Authenticated users can delete entities"
  on entities for delete
  to authenticated
  using (true);

-- Policies for signals table
create policy "Authenticated users can read signals"
  on signals for select
  to authenticated
  using (true);

create policy "Authenticated users can insert signals"
  on signals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update signals"
  on signals for update
  to authenticated
  using (true);

create policy "Authenticated users can delete signals"
  on signals for delete
  to authenticated
  using (true);

-- Policies for document_embeddings table
create policy "Authenticated users can read document_embeddings"
  on document_embeddings for select
  to authenticated
  using (true);

create policy "Authenticated users can insert document_embeddings"
  on document_embeddings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update document_embeddings"
  on document_embeddings for update
  to authenticated
  using (true);

create policy "Authenticated users can delete document_embeddings"
  on document_embeddings for delete
  to authenticated
  using (true);

-- Policies for daily_briefings table
create policy "Authenticated users can read daily_briefings"
  on daily_briefings for select
  to authenticated
  using (true);

create policy "Authenticated users can insert daily_briefings"
  on daily_briefings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update daily_briefings"
  on daily_briefings for update
  to authenticated
  using (true);

create policy "Authenticated users can delete daily_briefings"
  on daily_briefings for delete
  to authenticated
  using (true);

-- Policies for opportunities table
create policy "Authenticated users can read opportunities"
  on opportunities for select
  to authenticated
  using (true);

create policy "Authenticated users can insert opportunities"
  on opportunities for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update opportunities"
  on opportunities for update
  to authenticated
  using (true);

create policy "Authenticated users can delete opportunities"
  on opportunities for delete
  to authenticated
  using (true);

-- Policies for contacts table
create policy "Authenticated users can read contacts"
  on contacts for select
  to authenticated
  using (true);

create policy "Authenticated users can insert contacts"
  on contacts for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update contacts"
  on contacts for update
  to authenticated
  using (true);

create policy "Authenticated users can delete contacts"
  on contacts for delete
  to authenticated
  using (true);

-- Policies for interactions table
create policy "Authenticated users can read interactions"
  on interactions for select
  to authenticated
  using (true);

create policy "Authenticated users can insert interactions"
  on interactions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update interactions"
  on interactions for update
  to authenticated
  using (true);

create policy "Authenticated users can delete interactions"
  on interactions for delete
  to authenticated
  using (true);

-- Policies for account_plans table
create policy "Authenticated users can read account_plans"
  on account_plans for select
  to authenticated
  using (true);

create policy "Authenticated users can insert account_plans"
  on account_plans for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update account_plans"
  on account_plans for update
  to authenticated
  using (true);

create policy "Authenticated users can delete account_plans"
  on account_plans for delete
  to authenticated
  using (true);

-- Policies for system_profiles table
create policy "Authenticated users can read system_profiles"
  on system_profiles for select
  to authenticated
  using (true);

create policy "Authenticated users can insert system_profiles"
  on system_profiles for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update system_profiles"
  on system_profiles for update
  to authenticated
  using (true);

create policy "Authenticated users can delete system_profiles"
  on system_profiles for delete
  to authenticated
  using (true);

-- Policies for signal_actions table
create policy "Authenticated users can read signal_actions"
  on signal_actions for select
  to authenticated
  using (true);

create policy "Authenticated users can insert signal_actions"
  on signal_actions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update signal_actions"
  on signal_actions for update
  to authenticated
  using (true);

create policy "Authenticated users can delete signal_actions"
  on signal_actions for delete
  to authenticated
  using (true);

-- Policies for system_narratives table
create policy "Authenticated users can read system_narratives"
  on system_narratives for select
  to authenticated
  using (true);

create policy "Authenticated users can insert system_narratives"
  on system_narratives for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update system_narratives"
  on system_narratives for update
  to authenticated
  using (true);

create policy "Authenticated users can delete system_narratives"
  on system_narratives for delete
  to authenticated
  using (true);

-- Policies for sales_briefings table
create policy "Authenticated users can read sales_briefings"
  on sales_briefings for select
  to authenticated
  using (true);

create policy "Authenticated users can insert sales_briefings"
  on sales_briefings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update sales_briefings"
  on sales_briefings for update
  to authenticated
  using (true);

create policy "Authenticated users can delete sales_briefings"
  on sales_briefings for delete
  to authenticated
  using (true);

-- Policies for opportunity_suggestions table
create policy "Authenticated users can read opportunity_suggestions"
  on opportunity_suggestions for select
  to authenticated
  using (true);

create policy "Authenticated users can insert opportunity_suggestions"
  on opportunity_suggestions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update opportunity_suggestions"
  on opportunity_suggestions for update
  to authenticated
  using (true);

create policy "Authenticated users can delete opportunity_suggestions"
  on opportunity_suggestions for delete
  to authenticated
  using (true);

-- Policies for outbound_playbooks table
create policy "Authenticated users can read outbound_playbooks"
  on outbound_playbooks for select
  to authenticated
  using (true);

create policy "Authenticated users can insert outbound_playbooks"
  on outbound_playbooks for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update outbound_playbooks"
  on outbound_playbooks for update
  to authenticated
  using (true);

create policy "Authenticated users can delete outbound_playbooks"
  on outbound_playbooks for delete
  to authenticated
  using (true);

-- Policies for system_seeds table
create policy "Authenticated users can read system_seeds"
  on system_seeds for select
  to authenticated
  using (true);

create policy "Authenticated users can insert system_seeds"
  on system_seeds for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update system_seeds"
  on system_seeds for update
  to authenticated
  using (true);

create policy "Authenticated users can delete system_seeds"
  on system_seeds for delete
  to authenticated
  using (true);

-- Policies for news_sources table
create policy "Authenticated users can read news_sources"
  on news_sources for select
  to authenticated
  using (true);

create policy "Authenticated users can insert news_sources"
  on news_sources for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update news_sources"
  on news_sources for update
  to authenticated
  using (true);

create policy "Authenticated users can delete news_sources"
  on news_sources for delete
  to authenticated
  using (true);

-- Policies for pipeline_runs table
create policy "Authenticated users can read pipeline_runs"
  on pipeline_runs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert pipeline_runs"
  on pipeline_runs for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update pipeline_runs"
  on pipeline_runs for update
  to authenticated
  using (true);

create policy "Authenticated users can delete pipeline_runs"
  on pipeline_runs for delete
  to authenticated
  using (true);

-- Policies for daily_briefing_runs table
create policy "Authenticated users can read daily_briefing_runs"
  on daily_briefing_runs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert daily_briefing_runs"
  on daily_briefing_runs for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update daily_briefing_runs"
  on daily_briefing_runs for update
  to authenticated
  using (true);

create policy "Authenticated users can delete daily_briefing_runs"
  on daily_briefing_runs for delete
  to authenticated
  using (true);

-- Policies for feedback table
create policy "Authenticated users can read feedback"
  on feedback for select
  to authenticated
  using (true);

create policy "Authenticated users can insert feedback"
  on feedback for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update feedback"
  on feedback for update
  to authenticated
  using (true);

create policy "Authenticated users can delete feedback"
  on feedback for delete
  to authenticated
  using (true);

