import type { SupabaseClient } from "@supabase/supabase-js";

import { getGlobalInsights } from "./getGlobalInsights";

export interface HomeHeroBriefing {
  systemSlug: string;
  systemName: string;
  summary: string;
  created_at: string;
}

export async function getHomeHeroBriefing(
  supabase: SupabaseClient,
): Promise<HomeHeroBriefing | null> {
  // Get top system by pipeline
  const insights = await getGlobalInsights(supabase);

  if (insights.topByPipeline.length === 0) {
    return null;
  }

  const topSystem = insights.topByPipeline[0];

  // Fetch latest daily briefing for the top system
  const { data: briefing, error: briefingError } = await supabase
    .from("daily_briefings")
    .select("summary, created_at")
    .eq("system_id", topSystem.systemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ summary: string; created_at: string | null }>();

  if (briefingError) {
    throw briefingError;
  }

  if (!briefing || !briefing.summary || !briefing.created_at) {
    return null;
  }

  return {
    systemSlug: topSystem.slug,
    systemName: topSystem.name,
    summary: briefing.summary,
    created_at: briefing.created_at,
  };
}

