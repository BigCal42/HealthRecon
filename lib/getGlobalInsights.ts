import type { SupabaseClient } from "@supabase/supabase-js";

export interface GlobalSystemSummary {
  systemId: string;
  slug: string;
  name: string;
  openPipelineAmount: number | null;
  closedWonAmountLastWindow: number | null;
  signalCountLastWindow: number;
}

export interface GlobalInsights {
  windowDays: number;
  systemCount: number;
  totals: {
    openPipelineAmount: number | null;
    closedWonAmountLastWindow: number | null;
    closedLostAmountLastWindow: number | null;
    signalsLastWindow: number;
    signalActionsLastWindow: number;
    interactionsLastWindow: number;
    workItemsCreatedLastWindow: number;
    workItemsDoneLastWindow: number;
  };
  topByPipeline: GlobalSystemSummary[];
  topByClosedWon: GlobalSystemSummary[];
  topBySignals: GlobalSystemSummary[];
}

export async function getGlobalInsights(
  supabase: SupabaseClient,
  options?: { windowDays?: number }
): Promise<GlobalInsights> {
  // Window
  const windowDays = options?.windowDays ?? 90;
  const now = new Date();
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  // Fetch data in parallel
  const [
    { data: systems },
    { data: opportunities },
    { data: signals },
    { data: signalActions },
    { data: interactions },
    { data: workItems },
  ] = await Promise.all([
    supabase.from("systems").select("id, slug, name"),
    supabase
      .from("opportunities")
      .select("id, system_id, stage, amount, close_date"),
    supabase
      .from("signals")
      .select("id, system_id, created_at")
      .gte("created_at", startIso),
    supabase
      .from("signal_actions")
      .select("id, system_id, created_at")
      .gte("created_at", startIso),
    supabase
      .from("interactions")
      .select("id, system_id, occurred_at")
      .gte("occurred_at", startIso),
    supabase
      .from("work_items")
      .select("id, system_id, status, created_at, updated_at"),
  ]);

  const systemsList = systems ?? [];
  const opportunitiesList = opportunities ?? [];
  const signalsList = signals ?? [];
  const signalActionsList = signalActions ?? [];
  const interactionsList = interactions ?? [];
  const workItemsList = workItems ?? [];

  // Compute global totals
  const openPipelineAmounts: number[] = [];
  const closedWonAmounts: number[] = [];
  const closedLostAmounts: number[] = [];

  for (const opp of opportunitiesList) {
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

  const openPipelineAmount =
    openPipelineAmounts.length > 0
      ? openPipelineAmounts.reduce((a, b) => a + b, 0)
      : null;
  const closedWonAmountLastWindow =
    closedWonAmounts.length > 0
      ? closedWonAmounts.reduce((a, b) => a + b, 0)
      : null;
  const closedLostAmountLastWindow =
    closedLostAmounts.length > 0
      ? closedLostAmounts.reduce((a, b) => a + b, 0)
      : null;

  // Work items created/done in window
  let workItemsCreatedLastWindow = 0;
  let workItemsDoneLastWindow = 0;

  for (const item of workItemsList) {
    const createdAt = item.created_at ? new Date(item.created_at) : null;
    if (createdAt && createdAt >= start) {
      workItemsCreatedLastWindow++;
    }

    if (item.status === "done") {
      const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      const relevantDate = updatedAt ?? createdAt;

      if (relevantDate && relevantDate >= start) {
        workItemsDoneLastWindow++;
      }
    }
  }

  // Compute per-system summaries
  const systemSummaries: Map<string, GlobalSystemSummary> = new Map();

  // Initialize all systems
  for (const system of systemsList) {
    systemSummaries.set(system.id, {
      systemId: system.id,
      slug: system.slug,
      name: system.name,
      openPipelineAmount: null,
      closedWonAmountLastWindow: null,
      signalCountLastWindow: 0,
    });
  }

  // Aggregate opportunities by system
  for (const opp of opportunitiesList) {
    if (!opp.system_id) continue;
    const summary = systemSummaries.get(opp.system_id);
    if (!summary) continue;

    // Open pipeline
    if (opp.stage !== "closed_won" && opp.stage !== "closed_lost" && opp.amount !== null) {
      summary.openPipelineAmount =
        (summary.openPipelineAmount ?? 0) + opp.amount;
    }

    // Closed won in window
    if (
      opp.stage === "closed_won" &&
      opp.close_date &&
      opp.amount !== null
    ) {
      const closeDate = new Date(opp.close_date);
      if (closeDate >= start) {
        summary.closedWonAmountLastWindow =
          (summary.closedWonAmountLastWindow ?? 0) + opp.amount;
      }
    }
  }

  // Aggregate signals by system
  for (const signal of signalsList) {
    if (!signal.system_id) continue;
    const summary = systemSummaries.get(signal.system_id);
    if (summary) {
      summary.signalCountLastWindow++;
    }
  }

  const summariesArray = Array.from(systemSummaries.values());

  // Derive top systems
  const topByPipeline = summariesArray
    .filter((s) => s.openPipelineAmount !== null && s.openPipelineAmount > 0)
    .sort((a, b) => (b.openPipelineAmount ?? 0) - (a.openPipelineAmount ?? 0))
    .slice(0, 5);

  const topByClosedWon = summariesArray
    .filter(
      (s) =>
        s.closedWonAmountLastWindow !== null && s.closedWonAmountLastWindow > 0
    )
    .sort(
      (a, b) =>
        (b.closedWonAmountLastWindow ?? 0) - (a.closedWonAmountLastWindow ?? 0)
    )
    .slice(0, 5);

  const topBySignals = summariesArray
    .filter((s) => s.signalCountLastWindow > 0)
    .sort((a, b) => b.signalCountLastWindow - a.signalCountLastWindow)
    .slice(0, 5);

  return {
    windowDays,
    systemCount: systemsList.length,
    totals: {
      openPipelineAmount,
      closedWonAmountLastWindow,
      closedLostAmountLastWindow,
      signalsLastWindow: signalsList.length,
      signalActionsLastWindow: signalActionsList.length,
      interactionsLastWindow: interactionsList.length,
      workItemsCreatedLastWindow,
      workItemsDoneLastWindow,
    },
    topByPipeline,
    topByClosedWon,
    topBySignals,
  };
}

