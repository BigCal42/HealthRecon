import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const ctx = createRequestContext("/api/systems");
  ctx.logInfo("Systems fetch request received");

  try {
    const systemsGetSchema = z.object({
      limit: z.string().transform((val) => parseInt(val, 10)).default("100"),
      offset: z.string().transform((val) => parseInt(val, 10)).default("0"),
    });

    const validated = validateQuery(request.url, systemsGetSchema);
    const limit = validated.limit;
    const offset = validated.offset;

    // Enforce reasonable limits (higher default for systems since there are likely few)
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);

    const supabase = createServerSupabaseClient();

    const { data: systems, error, count } = await supabase
      .from("systems")
      .select("id, slug, name", { count: "exact" })
      .order("name", { ascending: true })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      ctx.logError(error, "Failed to fetch systems", { limit: safeLimit, offset: safeOffset });
      return apiError(500, "fetch_failed", "Failed to fetch systems");
    }

    ctx.logInfo("Systems fetched successfully", { count: systems?.length ?? 0 });
    return apiSuccess({
      systems: systems ?? [],
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total: count ?? 0,
        hasMore: (count ?? 0) > safeOffset + safeLimit,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Systems API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

