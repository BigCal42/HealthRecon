import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateCronRequest } from "@/lib/cronAuth";
import { runAutoBriefings } from "@/lib/pipeline/autoBriefings";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

/**
 * Cron endpoint for automated daily briefing generation.
 * Called by Vercel Cron at 6 AM daily.
 */
export async function GET(request: Request) {
  const ctx = createRequestContext("/api/cron/daily-briefings");
  ctx.logInfo("Daily briefings cron job triggered");

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
    const result = await runAutoBriefings(supabase);

    ctx.logInfo("Daily briefings cron completed", {
      totalSystems: result.totalSystems,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Daily briefings cron error");
    return apiError(500, "cron_failed", "Daily briefings cron job failed");
  }
}

