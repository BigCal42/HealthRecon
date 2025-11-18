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

type ProfileRow = {
  id: string;
  summary: unknown;
};

type PlaybookRow = {
  id: string;
  summary: unknown;
};

export async function getAccountPlanContext(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{
  system: SystemRow;
  contacts: ContactRow[];
  opportunities: OpportunityRow[];
  interactions: InteractionRow[];
  profile: ProfileRow | null;
  playbook: PlaybookRow | null;
}> {
  const [
    { data: systemRow, error: systemError },
    { data: contactRows, error: contactError },
    { data: opportunityRows, error: opportunityError },
    { data: interactionRows, error: interactionError },
    { data: profileRow, error: profileError },
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
      .from("system_profiles")
      .select("id, summary")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("outbound_playbooks")
      .select("id, summary")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PlaybookRow>(),
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

  if (profileError) {
    throw profileError;
  }

  if (playbookError) {
    throw playbookError;
  }

  if (!systemRow) {
    throw new Error("System not found");
  }

  return {
    system: systemRow,
    contacts: contactRows ?? [],
    opportunities: opportunityRows ?? [],
    interactions: interactionRows ?? [],
    profile: profileRow,
    playbook: playbookRow,
  };
}

