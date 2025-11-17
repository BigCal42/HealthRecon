import type { SupabaseClient } from "@supabase/supabase-js";

export interface SystemMetrics {
  id: string;
  slug: string;
  name: string;
  website?: string | null;
  documentCount: number;
  signalCount: number;
  opportunityCount: number;
  lastPipelineRunAt?: string | null;
  lastDailyBriefingAt?: string | null;
}

export async function getSystemMetrics(
  supabase: SupabaseClient,
): Promise<SystemMetrics[]> {
  type SystemRow = {
    id: string;
    slug: string;
    name: string;
    website: string | null;
  };

  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name, website")
    .order("name", { ascending: true })
    .returns<SystemRow[]>();

  if (!systems || systems.length === 0) {
    return [];
  }

  type IdRow = { system_id: string | null };
  type RunRow = { system_id: string | null; created_at: string | null };

  const [
    { data: documents },
    { data: signals },
    { data: opportunities },
    { data: pipelineRuns },
    { data: briefingRuns },
  ] = await Promise.all([
    supabase.from("documents").select("system_id").returns<IdRow[]>(),
    supabase.from("signals").select("system_id").returns<IdRow[]>(),
    supabase.from("opportunities").select("system_id").returns<IdRow[]>(),
    supabase
      .from("pipeline_runs")
      .select("system_id, created_at")
      .order("created_at", { ascending: false })
      .returns<RunRow[]>(),
    supabase
      .from("daily_briefing_runs")
      .select("system_id, created_at")
      .order("created_at", { ascending: false })
      .returns<RunRow[]>(),
  ]);

  const docCounts = new Map<string, number>();
  const signalCounts = new Map<string, number>();
  const oppCounts = new Map<string, number>();
  const latestPipelineRun = new Map<string, string>();
  const latestBriefingRun = new Map<string, string>();

  (documents ?? []).forEach((doc) => {
    if (doc.system_id) {
      docCounts.set(doc.system_id, (docCounts.get(doc.system_id) ?? 0) + 1);
    }
  });

  (signals ?? []).forEach((signal) => {
    if (signal.system_id) {
      signalCounts.set(
        signal.system_id,
        (signalCounts.get(signal.system_id) ?? 0) + 1,
      );
    }
  });

  (opportunities ?? []).forEach((opp) => {
    if (opp.system_id) {
      oppCounts.set(opp.system_id, (oppCounts.get(opp.system_id) ?? 0) + 1);
    }
  });

  (pipelineRuns ?? []).forEach((run) => {
    if (run.system_id && run.created_at && !latestPipelineRun.has(run.system_id)) {
      latestPipelineRun.set(run.system_id, run.created_at);
    }
  });

  (briefingRuns ?? []).forEach((run) => {
    if (run.system_id && run.created_at && !latestBriefingRun.has(run.system_id)) {
      latestBriefingRun.set(run.system_id, run.created_at);
    }
  });

  return systems.map((system) => ({
    id: system.id,
    slug: system.slug,
    name: system.name,
    website: system.website ?? null,
    documentCount: docCounts.get(system.id) ?? 0,
    signalCount: signalCounts.get(system.id) ?? 0,
    opportunityCount: oppCounts.get(system.id) ?? 0,
    lastPipelineRunAt: latestPipelineRun.get(system.id) ?? null,
    lastDailyBriefingAt: latestBriefingRun.get(system.id) ?? null,
  }));
}

