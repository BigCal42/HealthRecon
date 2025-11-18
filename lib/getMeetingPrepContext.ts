import type { SupabaseClient } from "@supabase/supabase-js";

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

type ContactRow = {
  id: string;
  full_name: string;
  title: string | null;
  department: string | null;
  seniority: string | null;
  role_in_deal: string | null;
  is_primary: boolean;
};

type OpportunityRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string | null;
};

type InteractionRow = {
  id: string;
  channel: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  next_step: string | null;
  next_step_due_at: string | null;
};

type SignalRow = {
  id: string;
  category: string | null;
  severity: string | null;
  summary: string | null;
  created_at: string | null;
};

type NewsRow = {
  id: string;
  title: string | null;
  source_type: string | null;
  crawled_at: string | null;
  raw_text: string | null;
};

type AccountPlanRow = {
  id: string;
  summary: unknown;
};

type OutboundPlaybookRow = {
  id: string;
  summary: unknown;
};

export async function getMeetingPrepContext(
  supabase: SupabaseClient,
  systemId: string,
  opts?: { contactName?: string | null },
): Promise<{
  system: SystemRow;
  contacts: ContactRow[];
  primaryContact: ContactRow | null;
  opportunities: OpportunityRow[];
  interactions: InteractionRow[];
  signals: SignalRow[];
  news: NewsRow[];
  accountPlan: AccountPlanRow | null;
  outboundPlaybook: OutboundPlaybookRow | null;
}> {
  const [
    { data: systemRow, error: systemError },
    { data: contactRows, error: contactError },
    { data: opportunityRows, error: opportunityError },
    { data: interactionRows, error: interactionError },
    { data: signalRows, error: signalError },
    { data: newsRows, error: newsError },
    { data: accountPlanRow, error: accountPlanError },
    { data: playbookRow, error: playbookError },
  ] = await Promise.all([
    supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("id", systemId)
      .maybeSingle<SystemRow>(),
    supabase
      .from("contacts")
      .select("id, full_name, title, department, seniority, role_in_deal, is_primary")
      .eq("system_id", systemId)
      .returns<ContactRow[]>(),
    supabase
      .from("opportunities")
      .select("id, title, description, status, created_at")
      .eq("system_id", systemId)
      .returns<OpportunityRow[]>(),
    supabase
      .from("interactions")
      .select("id, channel, subject, summary, occurred_at, next_step, next_step_due_at")
      .eq("system_id", systemId)
      .order("occurred_at", { ascending: false })
      .limit(20)
      .returns<InteractionRow[]>(),
    supabase
      .from("signals")
      .select("id, category, severity, summary, created_at")
      .eq("system_id", systemId)
      .gte("created_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .returns<SignalRow[]>(),
    supabase
      .from("documents")
      .select("id, title, source_type, crawled_at, raw_text")
      .eq("system_id", systemId)
      .eq("source_type", "news")
      .gte("crawled_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order("crawled_at", { ascending: false })
      .returns<NewsRow[]>(),
    supabase
      .from("account_plans")
      .select("id, summary")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AccountPlanRow>(),
    supabase
      .from("outbound_playbooks")
      .select("id, summary")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<OutboundPlaybookRow>(),
  ]);

  if (systemError) {
    throw systemError;
  }

  if (contactError) {
    throw contactError;
  }

  if (opportunityError) {
    throw opportunityError;
  }

  if (interactionError) {
    throw interactionError;
  }

  if (signalError) {
    throw signalError;
  }

  if (newsError) {
    throw newsError;
  }

  if (accountPlanError) {
    throw accountPlanError;
  }

  if (playbookError) {
    throw playbookError;
  }

  if (!systemRow) {
    throw new Error("System not found");
  }

  const contacts = contactRows ?? [];
  let primaryContact: ContactRow | null = null;

  if (opts?.contactName) {
    const contactNameLower = opts.contactName.toLowerCase().trim();
    primaryContact =
      contacts.find(
        (c) =>
          c.full_name.toLowerCase() === contactNameLower ||
          c.full_name.toLowerCase().startsWith(contactNameLower),
      ) ?? null;
  }

  return {
    system: systemRow,
    contacts,
    primaryContact,
    opportunities: opportunityRows ?? [],
    interactions: interactionRows ?? [],
    signals: signalRows ?? [],
    news: newsRows ?? [],
    accountPlan: accountPlanRow,
    outboundPlaybook: playbookRow,
  };
}

