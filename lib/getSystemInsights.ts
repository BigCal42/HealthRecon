import type { SupabaseClient } from "@supabase/supabase-js";

export interface SystemInsightsSignals {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  actions: {
    totalSignalActions: number;
    followThroughRate: number | null; // 0–1 or null if signals = 0
  };
}

export interface SystemInsightsOpportunities {
  total: number;
  byStage: Record<string, number>;
  openPipelineAmount: number | null;
  closedWonAmountLastWindow: number | null;
  closedLostAmountLastWindow: number | null;
}

export interface SystemInsightsWork {
  openWorkItems: number;
  completedWorkItemsLastWindow: number;
}

export interface SystemInsightsInteractions {
  totalLastWindow: number;
  lastInteractionAt: string | null;
}

export interface SystemInsights {
  systemId: string;
  slug: string;
  name: string;
  windowDays: number;
  signals: SystemInsightsSignals;
  opportunities: SystemInsightsOpportunities;
  work: SystemInsightsWork;
  interactions: SystemInsightsInteractions;
}

export async function getSystemInsights(
  supabase: SupabaseClient,
  systemSlug: string,
  options?: { windowDays?: number }
): Promise<SystemInsights | null> {
  // Resolve system
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", systemSlug)
    .maybeSingle();

  if (systemError || !system) return null;

  // Window
  const windowDays = options?.windowDays ?? 90;
  const now = new Date();
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  // Fetch data in parallel
  const [
    { data: signals },
    { data: signalActions },
    { data: opportunities },
    { data: workItems },
    { data: interactions },
  ] = await Promise.all([
    supabase
      .from("signals")
      .select("id, category, severity, created_at")
      .eq("system_id", system.id)
      .gte("created_at", startIso),
    supabase
      .from("signal_actions")
      .select("id, created_at")
      .eq("system_id", system.id)
      .gte("created_at", startIso),
    supabase
      .from("opportunities")
      .select("id, stage, amount, currency, status, created_at, updated_at, close_date")
      .eq("system_id", system.id),
    supabase
      .from("work_items")
      .select("id, status, created_at, updated_at")
      .eq("system_id", system.id),
    supabase
      .from("interactions")
      .select("id, occurred_at")
      .eq("system_id", system.id)
      .gte("occurred_at", startIso),
  ]);

  const signalsList = signals ?? [];
  const signalActionsList = signalActions ?? [];
  const opportunitiesList = opportunities ?? [];
  const workItemsList = workItems ?? [];
  const interactionsList = interactions ?? [];

  // Compute signals metrics
  const signalsTotal = signalsList.length;
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const signal of signalsList) {
    const category = signal.category ?? "uncategorized";
    byCategory[category] = (byCategory[category] ?? 0) + 1;

    const severity = signal.severity ?? "unknown";
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
  }

  const totalSignalActions = signalActionsList.length;
  const followThroughRate =
    signalsTotal > 0 ? totalSignalActions / signalsTotal : null;

  // Compute opportunities metrics
  const opportunitiesTotal = opportunitiesList.length;
  const byStage: Record<string, number> = {};
  let openPipelineAmount: number | null = null;
  let closedWonAmountLastWindow: number | null = null;
  let closedLostAmountLastWindow: number | null = null;

  const openPipelineAmounts: number[] = [];
  const closedWonAmounts: number[] = [];
  const closedLostAmounts: number[] = [];

  for (const opp of opportunitiesList) {
    const stage = opp.stage ?? "unknown";
    byStage[stage] = (byStage[stage] ?? 0) + 1;

    // Open pipeline: not closed_won or closed_lost
    if (opp.stage !== "closed_won" && opp.stage !== "closed_lost" && opp.amount !== null) {
      openPipelineAmounts.push(opp.amount);
    }

    // Closed won in window
    if (
      opp.stage === "closed_won" &&
      opp.close_date &&
      opp.amount !== null
    ) {
      const closeDate = new Date(opp.close_date);
      if (closeDate >= start) {
        closedWonAmounts.push(opp.amount);
      }
    }

    // Closed lost in window
    if (
      opp.stage === "closed_lost" &&
      opp.close_date &&
      opp.amount !== null
    ) {
      const closeDate = new Date(opp.close_date);
      if (closeDate >= start) {
        closedLostAmounts.push(opp.amount);
      }
    }
  }

  if (openPipelineAmounts.length > 0) {
    openPipelineAmount = openPipelineAmounts.reduce((a, b) => a + b, 0);
  }

  if (closedWonAmounts.length > 0) {
    closedWonAmountLastWindow = closedWonAmounts.reduce((a, b) => a + b, 0);
  }

  if (closedLostAmounts.length > 0) {
    closedLostAmountLastWindow = closedLostAmounts.reduce((a, b) => a + b, 0);
  }

  // Compute work items metrics
  let openWorkItems = 0;
  let completedWorkItemsLastWindow = 0;

  for (const item of workItemsList) {
    // Consider 'open' and 'snoozed' as open
    if (item.status === "open" || item.status === "snoozed") {
      openWorkItems++;
    }

    // Completed in window
    if (item.status === "done") {
      const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      const relevantDate = updatedAt ?? createdAt;

      if (relevantDate && relevantDate >= start) {
        completedWorkItemsLastWindow++;
      }
    }
  }

  // Compute interactions metrics
  const totalLastWindow = interactionsList.length;
  let lastInteractionAt: string | null = null;

  if (interactionsList.length > 0) {
    const dates = interactionsList
      .map((i) => i.occurred_at)
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d).getTime());
    if (dates.length > 0) {
      const maxTime = Math.max(...dates);
      lastInteractionAt = new Date(maxTime).toISOString();
    }
  }

  return {
    systemId: system.id,
    slug: system.slug,
    name: system.name,
    windowDays,
    signals: {
      total: signalsTotal,
      byCategory,
      bySeverity,
      actions: {
        totalSignalActions,
        followThroughRate,
      },
    },
    opportunities: {
      total: opportunitiesTotal,
      byStage,
      openPipelineAmount,
      closedWonAmountLastWindow,
      closedLostAmountLastWindow,
    },
    work: {
      openWorkItems,
      completedWorkItemsLastWindow,
    },
    interactions: {
      totalLastWindow,
      lastInteractionAt,
    },
  };
}

