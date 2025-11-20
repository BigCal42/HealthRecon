import type { SupabaseClient } from "@supabase/supabase-js";

import { getGlobalInsights } from "./getGlobalInsights";

export interface HomeSystemSummary {
  systemId: string;
  slug: string;
  name: string;
  location?: string | null;
  openPipelineAmount: number | null;
}

export async function getHomeTopSystems(
  supabase: SupabaseClient,
): Promise<HomeSystemSummary[]> {
  // Get global insights which already includes topByPipeline (top 5 systems)
  const insights = await getGlobalInsights(supabase);

  if (insights.topByPipeline.length === 0) {
    return [];
  }

  // Fetch location data for the top systems
  const systemIds = insights.topByPipeline.map((s) => s.systemId);
  const { data: systems, error: systemsError } = await supabase
    .from("systems")
    .select("id, hq_city, hq_state")
    .in("id", systemIds);

  if (systemsError) {
    throw systemsError;
  }

  // Create a map of system ID to location
  const locationMap = new Map<string, string | null>();
  (systems ?? []).forEach((system) => {
    const parts: string[] = [];
    if (system.hq_city) parts.push(system.hq_city);
    if (system.hq_state) parts.push(system.hq_state);
    const location = parts.length > 0 ? parts.join(", ") : null;
    locationMap.set(system.id, location);
  });

  // Map topByPipeline to HomeSystemSummary format
  return insights.topByPipeline.map((summary) => ({
    systemId: summary.systemId,
    slug: summary.slug,
    name: summary.name,
    location: locationMap.get(summary.systemId) ?? null,
    openPipelineAmount: summary.openPipelineAmount,
  }));
}

