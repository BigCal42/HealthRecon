import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateAdminAuth } from "@/lib/api/auth";
import { getAnalytics } from "@/lib/getAnalytics";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

/**
 * Admin endpoint for analytics data.
 * Requires admin authentication.
 */
export async function GET(request: Request) {
  const ctx = createRequestContext("/api/admin/analytics");
  ctx.logInfo("Analytics request received");

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

    const analytics = await getAnalytics();

    ctx.logInfo("Analytics data retrieved successfully");
    return apiSuccess(analytics);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Analytics retrieval error");
    return apiError(500, "analytics_failed", "Failed to retrieve analytics");
  }
}

