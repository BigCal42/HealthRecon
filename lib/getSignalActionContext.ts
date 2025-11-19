import type { SupabaseClient } from "@supabase/supabase-js";

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

type SignalRow = {
  id: string;
  summary: string;
  category: string | null;
  severity: string | null;
  created_at: string | null;
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

type AccountPlanRow = {
  id: string;
  summary: unknown;
};

type OutboundPlaybookRow = {
  id: string;
  summary: unknown;
};

export async function getSignalActionContext(
  supabase: SupabaseClient,
  systemId: string,
  signalId: string,
): Promise<{
  system: SystemRow;
  signal: SignalRow;
  contacts: ContactRow[];
  opportunities: OpportunityRow[];
  accountPlan: AccountPlanRow | null;
  outboundPlaybook: OutboundPlaybookRow | null;
}> {
  const [
    { data: systemRow, error: systemError },
    { data: signalRow, error: signalError },
    { data: contactRows, error: contactError },
    { data: opportunityRows, error: opportunityError },
    { data: accountPlanRow, error: accountPlanError },
    { data: playbookRow, error: playbookError },
  ] = await Promise.all([
    supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("id", systemId)
      .maybeSingle<SystemRow>(),
    supabase
      .from("signals")
      .select("id, summary, category, severity, created_at")
      .eq("id", signalId)
      .eq("system_id", systemId)
      .maybeSingle<SignalRow>(),
    supabase
      .from("contacts")
      .select("id, full_name, title, department, seniority, role_in_deal, is_primary")
      .eq("system_id", systemId)
      .or("is_primary.eq.true,seniority.in.(exec,executive),role_in_deal.in.(decision_maker,champion)")
      .returns<ContactRow[]>(),
    supabase
      .from("opportunities")
      .select("id, title, description, status, created_at")
      .eq("system_id", systemId)
      .in("status", ["open", "in_progress"])
      .returns<OpportunityRow[]>(),
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

  if (signalError) {
    throw signalError;
  }

  if (contactError) {
    throw contactError;
  }

  if (opportunityError) {
    throw opportunityError;
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

  if (!signalRow) {
    throw new Error("Signal not found or does not belong to system");
  }

  return {
    system: systemRow,
    signal: signalRow,
    contacts: contactRows ?? [],
    opportunities: opportunityRows ?? [],
    accountPlan: accountPlanRow,
    outboundPlaybook: playbookRow,
  };
}

