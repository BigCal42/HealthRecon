import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateCronRequest } from "@/lib/cronAuth";
import { runAutoIngest } from "@/lib/pipeline/autoIngest";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

/**
 * Cron endpoint for automated daily ingestion.
 * Called by Vercel Cron at 2 AM daily.
 */
export async function GET(request: Request) {
  const ctx = createRequestContext("/api/cron/daily-ingest");
  ctx.logInfo("Daily ingestion cron job triggered");

  try {
    // Validate cron request
    try {
      validateCronRequest(request);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }

    const supabase = createServerSupabaseClient();
    const result = await runAutoIngest(supabase);

    ctx.logInfo("Daily ingestion cron completed", {
      totalSystems: result.totalSystems,
      successful: result.successful,
      failed: result.failed,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Daily ingestion cron error");
    return apiError(500, "cron_failed", "Daily ingestion cron job failed");
  }
}

