import type { SupabaseClient } from "@supabase/supabase-js";

type NarrativeSystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

type NarrativeSignalRow = {
  id: string;
  summary: string | null;
  category: string | null;
  severity: string | null;
  created_at: string | null;
};

type NarrativeNewsRow = {
  id: string;
  title: string | null;
  source_type: string | null;
  crawled_at: string | null;
  raw_text: string | null;
};

type NarrativeOpportunityRow = {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

type NarrativeInteractionRow = {
  id: string;
  channel: string | null;
  subject: string | null;
  summary: string | null;
  occurred_at: string | null;
  next_step: string | null;
};

type NarrativeAccountPlanRow = {
  id: string;
  summary: unknown;
  created_at: string | null;
};

type NarrativeProfileRow = {
  id: string;
  summary: unknown;
  created_at: string | null;
};

type NarrativeSignalActionRow = {
  id: string;
  action_category: string | null;
  action_description: string | null;
  created_at: string | null;
};

export async function getSystemNarrativeContext(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{
  system: NarrativeSystemRow;
  signals: NarrativeSignalRow[];
  news: NarrativeNewsRow[];
  opportunities: NarrativeOpportunityRow[];
  interactions: NarrativeInteractionRow[];
  accountPlan: NarrativeAccountPlanRow | null;
  profile: NarrativeProfileRow | null;
  signalActions: NarrativeSignalActionRow[];
}> {
  const now = new Date();
  const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: systemRow, error: systemError },
    { data: signalRows, error: signalError },
    { data: newsRows, error: newsError },
    { data: opportunityRows, error: opportunityError },
    { data: interactionRows, error: interactionError },
    { data: accountPlanRow, error: accountPlanError },
    { data: profileRow, error: profileError },
    { data: signalActionRows, error: signalActionError },
  ] = await Promise.all([
    supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("id", systemId)
      .maybeSingle<NarrativeSystemRow>(),
    supabase
      .from("signals")
      .select("id, summary, category, severity, created_at")
      .eq("system_id", systemId)
      .gte("created_at", days90Ago)
      .order("created_at", { ascending: false })
      .returns<NarrativeSignalRow[]>(),
    supabase
      .from("documents")
      .select("id, title, source_type, crawled_at, raw_text")
      .eq("system_id", systemId)
      .eq("source_type", "news")
      .gte("crawled_at", days90Ago)
      .order("crawled_at", { ascending: false })
      .returns<NarrativeNewsRow[]>(),
    supabase
      .from("opportunities")
      .select("id, title, description, status, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .returns<NarrativeOpportunityRow[]>(),
    supabase
      .from("interactions")
      .select("id, channel, subject, summary, occurred_at, next_step")
      .eq("system_id", systemId)
      .gte("occurred_at", days30Ago)
      .order("occurred_at", { ascending: false })
      .returns<NarrativeInteractionRow[]>(),
    supabase
      .from("account_plans")
      .select("id, summary, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<NarrativeAccountPlanRow>(),
    supabase
      .from("system_profiles")
      .select("id, summary, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<NarrativeProfileRow>(),
    supabase
      .from("signal_actions")
      .select("id, action_category, action_description, created_at")
      .eq("system_id", systemId)
      .gte("created_at", days30Ago)
      .order("created_at", { ascending: false })
      .returns<NarrativeSignalActionRow[]>(),
  ]);

  if (systemError) {
    throw systemError;
  }

  if (signalError) {
    throw signalError;
  }

  if (newsError) {
    throw newsError;
  }

  if (opportunityError) {
    throw opportunityError;
  }

  if (interactionError) {
    throw interactionError;
  }

  if (accountPlanError) {
    throw accountPlanError;
  }

  if (profileError) {
    throw profileError;
  }

  if (signalActionError) {
    throw signalActionError;
  }

  if (!systemRow) {
    throw new Error("System not found");
  }

  return {
    system: systemRow,
    signals: signalRows ?? [],
    news: newsRows ?? [],
    opportunities: opportunityRows ?? [],
    interactions: interactionRows ?? [],
    accountPlan: accountPlanRow,
    profile: profileRow,
    signalActions: signalActionRows ?? [],
  };
}

