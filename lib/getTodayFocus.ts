import type { SupabaseClient } from "@supabase/supabase-js";

import { getSystemHealthScores, type HealthBand } from "./getSystemHealthScore";

export interface TodayFocusItem {
  id: string;
  type: "signal_action" | "opportunity" | "interaction" | "system";
  systemId: string;
  systemSlug: string;
  systemName: string;
  title: string;
  description?: string | null;
  when?: string | null; // ISO string or date-like
  band?: HealthBand | null;
  meta?: Record<string, any>;
}

export interface TodayFocusResult {
  date: string; // YYYY-MM-DD
  items: TodayFocusItem[];
}

type SystemRow = {
  id: string;
  slug: string;
  name: string;
};

type SignalActionRow = {
  id: string;
  system_id: string;
  action_category: string;
  action_description: string;
  confidence: number;
  created_at: string;
};

type OpportunityRow = {
  id: string;
  system_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type InteractionRow = {
  id: string;
  system_id: string;
  channel: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  next_step_due_at: string | null;
};

export async function getTodayFocus(
  supabase: SupabaseClient,
  forDate: Date,
): Promise<TodayFocusResult> {
  // Compute day window (UTC)
  const start = new Date(forDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  // Fetch systems
  const { data: systems, error: systemsError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .returns<SystemRow[]>();

  if (systemsError) {
    throw systemsError;
  }

  const systemMap = new Map<string, SystemRow>();
  (systems ?? []).forEach((system) => {
    systemMap.set(system.id, system);
  });

  // Fetch health scores once
  const healthScores = await getSystemHealthScores(supabase);
  const healthMap = new Map<string, HealthBand>();
  healthScores.forEach((score) => {
    healthMap.set(score.systemId, score.band);
  });

  // Compute date boundaries for queries
  const sevenDaysAgo = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch signal_actions (last 7 days)
  const { data: signalActions, error: signalActionsError } = await supabase
    .from("signal_actions")
    .select("id, system_id, action_category, action_description, confidence, created_at")
    .gte("created_at", sevenDaysAgo.toISOString())
    .lt("created_at", end.toISOString())
    .returns<SignalActionRow[]>();

  if (signalActionsError) {
    throw signalActionsError;
  }

  // Fetch opportunities (open/in_progress)
  const { data: opportunities, error: opportunitiesError } = await supabase
    .from("opportunities")
    .select("id, system_id, title, status, created_at, updated_at")
    .or("status.eq.open,status.eq.in_progress")
    .returns<OpportunityRow[]>();

  if (opportunitiesError) {
    throw opportunitiesError;
  }

  // Filter opportunities for recency (updated/created in last 30 days)
  const recentOpportunities = (opportunities ?? []).filter((opp) => {
    const updateTime = opp.updated_at ? new Date(opp.updated_at) : new Date(opp.created_at);
    return updateTime >= thirtyDaysAgo;
  });

  // Fetch all interactions
  const { data: interactions, error: interactionsError } = await supabase
    .from("interactions")
    .select("id, system_id, channel, subject, summary, occurred_at, next_step_due_at")
    .returns<InteractionRow[]>();

  if (interactionsError) {
    throw interactionsError;
  }

  // Filter interactions for next_step_due_at <= end and not null
  const dueInteractions = (interactions ?? []).filter((ix) => {
    if (!ix.next_step_due_at) {
      return false;
    }
    const dueDate = new Date(ix.next_step_due_at);
    return dueDate <= end;
  });

  // Transform into TodayFocusItem[]
  const items: TodayFocusItem[] = [];

  // Signal actions
  (signalActions ?? []).forEach((sa) => {
    const system = systemMap.get(sa.system_id);
    if (!system) {
      return; // Skip if system not found
    }
    items.push({
      id: sa.id,
      type: "signal_action",
      systemId: sa.system_id,
      systemSlug: system.slug,
      systemName: system.name,
      title: sa.action_category,
      description: sa.action_description,
      when: sa.created_at,
      band: healthMap.get(sa.system_id) ?? null,
      meta: { confidence: sa.confidence },
    });
  });

  // Opportunities
  recentOpportunities.forEach((opp) => {
    const system = systemMap.get(opp.system_id);
    if (!system) {
      return; // Skip if system not found
    }
    items.push({
      id: opp.id,
      type: "opportunity",
      systemId: opp.system_id,
      systemSlug: system.slug,
      systemName: system.name,
      title: opp.title,
      description: opp.status,
      when: opp.updated_at ?? opp.created_at,
      band: healthMap.get(opp.system_id) ?? null,
      meta: { status: opp.status },
    });
  });

  // Interactions
  dueInteractions.forEach((ix) => {
    const system = systemMap.get(ix.system_id);
    if (!system) {
      return; // Skip if system not found
    }
    items.push({
      id: ix.id,
      type: "interaction",
      systemId: ix.system_id,
      systemSlug: system.slug,
      systemName: system.name,
      title: ix.subject ?? ix.channel,
      description: ix.summary,
      when: ix.next_step_due_at ?? ix.occurred_at,
      band: healthMap.get(ix.system_id) ?? null,
      meta: { channel: ix.channel },
    });
  });

  // Sort: interactions first, then signal_actions, then opportunities
  // Within each type, sort by `when` ascending (oldest due first)
  const typeWeight: Record<string, number> = {
    interaction: 3,
    signal_action: 2,
    opportunity: 1,
  };

  items.sort((a, b) => {
    // First by type weight
    const weightDiff = (typeWeight[b.type] ?? 0) - (typeWeight[a.type] ?? 0);
    if (weightDiff !== 0) {
      return weightDiff;
    }
    // Then by `when` ascending
    if (a.when && b.when) {
      return new Date(a.when).getTime() - new Date(b.when).getTime();
    }
    if (a.when) {
      return -1;
    }
    if (b.when) {
      return 1;
    }
    return 0;
  });

  return {
    date: start.toISOString().slice(0, 10),
    items,
  };
}

