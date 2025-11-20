import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getGlobalStrategyDashboard } from "@/lib/getGlobalStrategyDashboard";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/global-strategy");
  ctx.logInfo("Global strategy dashboard generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `global-strategy:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const supabase = createServerSupabaseClient();

    const postSchema = z.object({
      horizon: z.enum(["7d", "30d", "90d"]),
    });

    const body = await parseJsonBody(request, postSchema);

    const dashboard = await getGlobalStrategyDashboard(supabase, {
      horizon: body.horizon,
    });

    if (!dashboard) {
      return apiError(404, "generation_failed", "Failed to generate global strategy dashboard. Insufficient data may be available.");
    }

    ctx.logInfo("Global strategy dashboard generated successfully", {
      horizon: body.horizon,
    });

    return apiSuccess(dashboard);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Global strategy dashboard generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

