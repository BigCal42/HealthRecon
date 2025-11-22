import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase.types";
import { logger } from "@/lib/logger";

type DbPipelineRun = Database["public"]["Tables"]["pipeline_runs"]["Row"];

/**
 * Get recent pipeline runs for a given system.
 * Returns an empty array on error to allow graceful UI fallback.
 */
export async function getRecentPipelineRunsForSystem(
  supabase: SupabaseClient<Database>,
  systemId: string,
  limit = 5,
): Promise<DbPipelineRun[]> {
  try {
    const { data, error } = await supabase
      .from("pipeline_runs")
      .select("id, system_id, status, ingest_created, process_processed, error_message, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<DbPipelineRun[]>();

    if (error) {
      logger.error(error, "Failed to fetch pipeline runs", { systemId });
      return [];
    }

    return data ?? [];
  } catch (error) {
    logger.error(error, "Unexpected error fetching pipeline runs", { systemId });
    return [];
  }
}

