import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateQuery } from "@/lib/api/validate";
import { compareSystems } from "@/lib/compareSystems";
import { generateComparisonNarrative } from "@/lib/generateComparisonNarrative";
import { openai } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/compare");
  ctx.logInfo("Compare systems request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `compare:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  let slugA: string | undefined;
  let slugB: string | undefined;

  try {
    const compareSchema = z.object({
      slugA: z.string().min(1).max(100),
      slugB: z.string().min(1).max(100),
      noNarrative: z.string().transform((val) => val === "1").default("0"),
    });

    const validated = validateQuery(request.url, compareSchema);
    slugA = validated.slugA;
    slugB = validated.slugB;
    const noNarrative = validated.noNarrative;

    const supabase = createServerSupabaseClient();

    // Lookup systems by slug
    const [{ data: systemA, error: systemAError }, { data: systemB, error: systemBError }] =
      await Promise.all([
        supabase
          .from("systems")
          .select("id")
          .eq("slug", slugA)
          .maybeSingle<{ id: string }>(),
        supabase
          .from("systems")
          .select("id")
          .eq("slug", slugB)
          .maybeSingle<{ id: string }>(),
      ]);

    if (systemAError || !systemA) {
      return apiError(404, "system_not_found", `System with slug "${slugA}" not found`);
    }

    if (systemBError || !systemB) {
      return apiError(404, "system_not_found", `System with slug "${slugB}" not found`);
    }

    // Compare systems
    let comparison = await compareSystems(supabase, systemA.id, systemB.id);

    // Generate narratives unless skipped
    if (!noNarrative) {
      try {
        comparison = await generateComparisonNarrative(openai, comparison);
      } catch (error) {
        ctx.logError(error, "Failed to generate comparison narrative", { slugA, slugB });
        const message = error instanceof Error ? error.message : "Unknown error";
        return apiError(500, "narrative_generation_failed", message);
      }
    }

    ctx.logInfo("Systems compared successfully", { slugA, slugB });
    return apiSuccess({ comparison });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Compare API error", { slugA: slugA ?? "unknown", slugB: slugB ?? "unknown" });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

