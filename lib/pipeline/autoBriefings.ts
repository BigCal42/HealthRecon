import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import { getDailyInputs } from "@/lib/getDailyInputs";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";

export interface AutoBriefingResult {
  totalSystems: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    slug: string;
    success: boolean;
    skipped?: boolean;
    reason?: string;
    briefingId?: string;
    error?: string;
  }>;
}

type DailyBriefingPayload = {
  bullets: string[];
  narrative: string;
};

/**
 * Automatically generate daily briefings for all systems.
 * Skips systems that already have a briefing for today.
 * 
 * @param supabase - Supabase client
 * @returns Summary of briefing generation results
 */
export async function runAutoBriefings(supabase: SupabaseClient): Promise<AutoBriefingResult> {
  logger.info("Starting automated daily briefing generation for all systems");

  // Get all systems
  const { data: systems, error: systemsError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .order("slug");

  if (systemsError || !systems || systems.length === 0) {
    logger.error(systemsError, "Failed to fetch systems for auto-briefings");
    return {
      totalSystems: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
  }

  logger.info(`Found ${systems.length} systems to process`);

  const results: AutoBriefingResult["results"] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Get today's date in UTC (for checking existing briefings)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Process each system sequentially
  for (const system of systems) {
    try {
      // Check if briefing already exists for today
      const { data: existingBriefing } = await supabase
        .from("daily_briefings")
        .select("id")
        .eq("system_id", system.id)
        .gte("created_at", todayStr)
        .limit(1)
        .maybeSingle();

      if (existingBriefing) {
        logger.info(`Briefing already exists for ${system.slug} today, skipping`);
        results.push({
          slug: system.slug,
          success: false,
          skipped: true,
          reason: "briefing_already_exists",
        });
        skipped++;
        continue;
      }

      // Get inputs for briefing
      const { signals, documents } = await getDailyInputs(supabase, system.id);

      if (signals.length === 0 && documents.length === 0) {
        logger.info(`No recent activity for ${system.slug}, skipping briefing`);
        results.push({
          slug: system.slug,
          success: false,
          skipped: true,
          reason: "no_recent_activity",
        });
        skipped++;

        // Log the skip
        await supabase.from("daily_briefing_runs").insert({
          system_id: system.id,
          status: "no_recent_activity",
        });
        continue;
      }

      // Generate briefing
      logger.info(`Generating briefing for ${system.slug}`);

      const signalLines = signals.map(
        (signal) => `- [${signal.category}] (${signal.severity}) ${signal.summary ?? ""}`,
      );

      const documentLines = documents.map(
        (document) => `- ${document.title ?? "Untitled"} — ${document.sourceUrl}`,
      );

      const prompt = [
        "You are a briefing assistant summarizing healthcare system activity. Respond with concise JSON.",
        `System: ${system.name}`,
        "Signals from last 24 hours:",
        signalLines.join("\n") || "- None",
        "Documents from last 24 hours:",
        documentLines.join("\n") || "- None",
        "Produce a JSON object with keys `bullets` (array of short bullet strings) and `narrative` (succinct paragraph). Be specific and avoid repetition.",
      ].join("\n\n");

      const response = await createResponse({
        prompt,
        format: "json_object",
      });

      const rawOutput = extractTextFromResponse(response);

      if (!rawOutput) {
        throw new Error("Model response missing");
      }

      let parsed: DailyBriefingPayload;
      try {
        parsed = JSON.parse(rawOutput) as DailyBriefingPayload;
      } catch (error) {
        throw new Error(`Failed to parse model output: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (!Array.isArray(parsed.bullets) || typeof parsed.narrative !== "string") {
        throw new Error("Invalid response structure");
      }

      // Store briefing
      const { data: inserted, error: insertError } = await supabase
        .from("daily_briefings")
        .insert({
          system_id: system.id,
          summary: JSON.stringify(parsed),
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (insertError || !inserted) {
        throw new Error(`Failed to store briefing: ${insertError?.message ?? "unknown error"}`);
      }

      // Log success
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "success",
        briefing_id: inserted.id,
      });

      results.push({
        slug: system.slug,
        success: true,
        briefingId: inserted.id,
      });
      successful++;

      logger.info(`Briefing generated successfully for ${system.slug}`);

      // Small delay between systems to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(error, `Failed to generate briefing for system ${system.slug}`, { systemId: system.id });

      // Log error
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: errorMessage.substring(0, 500),
      });

      results.push({
        slug: system.slug,
        success: false,
        error: errorMessage,
      });
      failed++;
    }
  }

  logger.info("Automated briefing generation completed", {
    totalSystems: systems.length,
    successful,
    failed,
    skipped,
  });

  return {
    totalSystems: systems.length,
    successful,
    failed,
    skipped,
    results,
  };
}

