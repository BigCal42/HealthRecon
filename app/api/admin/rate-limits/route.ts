import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateAdminAuth } from "@/lib/api/auth";
import { getRateLimitStats } from "@/lib/getRateLimitStats";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

/**
 * Admin endpoint for rate limit statistics.
 * Requires admin authentication.
 */
export async function GET(request: Request) {
  const ctx = createRequestContext("/api/admin/rate-limits");
  ctx.logInfo("Rate limit stats request received");

  try {
    // Validate admin authentication
    try {
      validateAdminAuth(request);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }

    // Parse optional time range query parameter
    const url = new URL(request.url);
    const timeRangeHours = parseInt(url.searchParams.get("hours") ?? "24", 10);

    const stats = await getRateLimitStats(undefined, timeRangeHours);

    ctx.logInfo("Rate limit stats retrieved successfully", { timeRangeHours });
    return apiSuccess(stats);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Rate limit stats retrieval error");
    return apiError(500, "stats_failed", "Failed to retrieve rate limit statistics");
  }
}

