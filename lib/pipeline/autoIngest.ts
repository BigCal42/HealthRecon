import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import { runIngestForSystem } from "./ingest";

export interface AutoIngestResult {
  totalSystems: number;
  successful: number;
  failed: number;
  results: Array<{
    slug: string;
    success: boolean;
    documentsCreated?: number;
    error?: string;
  }>;
}

/**
 * Automatically ingest documents for all systems with active seeds.
 * Processes systems sequentially to avoid overwhelming Firecrawl API.
 * 
 * @param supabase - Supabase client
 * @returns Summary of ingestion results
 */
export async function runAutoIngest(supabase: SupabaseClient): Promise<AutoIngestResult> {
  logger.info("Starting automated ingestion for all systems");

  // Get all systems with active seeds
  const { data: systems, error: systemsError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .order("slug");

  if (systemsError || !systems || systems.length === 0) {
    logger.error(systemsError, "Failed to fetch systems for auto-ingest");
    return {
      totalSystems: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }

  // Check which systems have active seeds
  const systemsWithSeeds: Array<{ id: string; slug: string; name: string }> = [];

  for (const system of systems) {
    const { data: seeds, error: seedsError } = await supabase
      .from("system_seeds")
      .select("id")
      .eq("system_id", system.id)
      .eq("active", true)
      .limit(1);

    if (!seedsError && seeds && seeds.length > 0) {
      systemsWithSeeds.push(system);
    }
  }

  logger.info(`Found ${systemsWithSeeds.length} systems with active seeds`);

  const results: AutoIngestResult["results"] = [];
  let successful = 0;
  let failed = 0;

  // Process each system sequentially
  for (const system of systemsWithSeeds) {
    try {
      logger.info(`Ingesting documents for system: ${system.slug}`);
      const result = await runIngestForSystem(supabase, system.slug);

      results.push({
        slug: system.slug,
        success: true,
        documentsCreated: result.created,
      });
      successful++;

      logger.info(`Ingestion completed for ${system.slug}: ${result.created} documents created`);

      // Small delay between systems to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(error, `Failed to ingest for system ${system.slug}`, { systemId: system.id });

      results.push({
        slug: system.slug,
        success: false,
        error: errorMessage,
      });
      failed++;
    }
  }

  logger.info("Automated ingestion completed", {
    totalSystems: systemsWithSeeds.length,
    successful,
    failed,
  });

  return {
    totalSystems: systemsWithSeeds.length,
    successful,
    failed,
    results,
  };
}

