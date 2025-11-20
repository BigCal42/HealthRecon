import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getStrategyBriefing } from "@/lib/getStrategyBriefing";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/strategy-briefing");
  ctx.logInfo("Strategy briefing generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `strategy-briefing:${ip}`,
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
      systemSlug: z.string().min(1).max(100),
      horizonMonths: z.number().int().min(6).max(18),
    });

    const body = await parseJsonBody(request, postSchema);

    const briefing = await getStrategyBriefing(supabase, {
      systemSlug: body.systemSlug,
      horizonMonths: body.horizonMonths,
    });

    if (!briefing) {
      return apiError(404, "generation_failed", "Failed to generate strategy briefing. System may not exist or have insufficient data.");
    }

    ctx.logInfo("Strategy briefing generated successfully", {
      systemSlug: body.systemSlug,
      horizonMonths: body.horizonMonths,
    });

    return apiSuccess(briefing);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Strategy briefing generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

