import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateInternalApiKey } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validate";
import { BILH_SLUG } from "@/config/constants";
import { runIngestForSystem } from "@/lib/pipeline/ingest";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Firecrawl and Supabase integrations
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/ingest");
  ctx.logInfo("Ingest request received");

  try {
    // Validate internal API key
    try {
      validateInternalApiKey(request);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await checkRateLimit({
      key: `ingest:${ip}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
      return apiError(429, "rate_limited", "Rate limit exceeded.");
    }

    const ingestSchema = z.object({
      slug: z.string().min(1).max(100).optional(),
    });

    let slug = BILH_SLUG;

    try {
      const body = await parseJsonBody(request, ingestSchema);
      if (body.slug) {
        slug = body.slug;
      }
    } catch (error) {
      // If validation fails, return the error (or use default slug for empty body)
      if (error instanceof NextResponse) {
        return error;
      }
      // For other errors (e.g., empty body), use default slug
    }

    const supabase = createServerSupabaseClient();
    const result = await runIngestForSystem(supabase, slug);

    ctx.logInfo("Ingest completed successfully", { slug, created: result.created });
    return apiSuccess({ slug, created: result.created });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Ingestion error");
    const errorMessage = error instanceof Error ? error.message : "Unexpected server error";

    if (errorMessage === "System not found") {
      return apiError(404, "system_not_found", "System not found");
    }

    if (errorMessage === "No active seed URLs found for system") {
      return apiError(404, "no_seeds", "No active seed URLs found for system");
    }

    if (errorMessage === "Firecrawl API key is not configured") {
      return apiError(500, "config_error", "Firecrawl API key is not configured");
    }

    return apiError(500, "ingestion_failed", "Unexpected server error");
  }
}

