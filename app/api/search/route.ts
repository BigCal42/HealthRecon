import { apiError, apiSuccess } from "@/lib/api/error";
import { NextResponse } from "next/server";
import { validateQuery } from "@/lib/api/validate";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { globalSearch } from "@/lib/search";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { z } from "zod";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await checkRateLimit({
      key: `search:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
      return apiError(429, "rate_limited", "Rate limit exceeded.");
    }

    const searchSchema = z.object({
      q: z.string().max(500).optional(),
    });

    const { q } = validateQuery(request.url, searchSchema);

    if (!q || q.trim().length === 0) {
      return apiSuccess({ results: [] });
    }

    const supabase = createServerSupabaseClient();
    const results = await globalSearch(supabase, q, 10);

    return apiSuccess({ results });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    logger.error(error, "Search failed");
    return apiError(500, "search_failed", "An unexpected error occurred during search");
  }
}

