import { apiError, apiSuccess } from "@/lib/api/error";
import { NextResponse } from "next/server";
import { validateInternalApiKey } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validate";
import { BILH_SLUG } from "@/config/constants";
import { createRequestContext } from "@/lib/apiLogging";
import { runIngestForSystem } from "@/lib/pipeline/ingest";
import { runProcessForSystem } from "@/lib/pipeline/process";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { z } from "zod";

// Use Node.js runtime for Firecrawl, OpenAI, and Supabase integrations
export const runtime = "nodejs";

type PipelineError = "ingest_failed" | "process_failed";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/pipeline");
  ctx.logInfo("Pipeline request received");

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
    key: `pipeline:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }
  const supabase = createServerSupabaseClient();
  const pipelineSchema = z.object({
    slug: z.string().min(1).max(100).optional(),
  });

  let slug = BILH_SLUG;

  try {
    const body = await parseJsonBody(request, pipelineSchema);
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

  const { data: system } = await supabase
    .from("systems")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  let error: PipelineError | undefined;
  let errorMessage: string | undefined;

  let ingestSummary: { created: number } = { created: 0 };
  let processSummary: { processed: number } = { processed: 0 };

  try {
    try {
      const ingestResult = await runIngestForSystem(supabase, slug);
      ingestSummary = ingestResult;
    } catch (err) {
      error = "ingest_failed";
      errorMessage = String(err);
      ctx.logError(err, "Pipeline ingest error", { slug });
    }

    try {
      const processResult = await runProcessForSystem(supabase, slug);
      processSummary = processResult;
    } catch (err) {
      error = "process_failed";
      errorMessage = String(err);
      ctx.logError(err, "Pipeline process error", { slug });
    }

    const responsePayload: {
      slug: string;
      ingest: typeof ingestSummary;
      process: typeof processSummary;
      error?: PipelineError;
    } = {
      slug,
      ingest: ingestSummary,
      process: processSummary,
    };

    if (error) {
      responsePayload.error = error;
    }

    // Log run to database (non-blocking)
    if (system) {
      try {
        await supabase.from("pipeline_runs").insert({
          system_id: system.id,
          status: error ? "error" : "success",
          ingest_created: ingestSummary.created,
          process_processed: processSummary.processed,
          error_message: errorMessage ?? null,
        });
      } catch (logError) {
        ctx.logError(logError, "Failed to log pipeline run", { systemId: system.id });
      }
    }

    ctx.logInfo("Pipeline completed", { slug, ingest: ingestSummary, process: processSummary });

    return apiSuccess(responsePayload);
  } catch (err) {
    // Log error run if system is available
    if (system) {
      try {
        await supabase.from("pipeline_runs").insert({
          system_id: system.id,
          status: "error",
          ingest_created: ingestSummary.created,
          process_processed: processSummary.processed,
          error_message: String(err),
        });
      } catch (logError) {
        ctx.logError(logError, "Failed to log pipeline run error", { systemId: system.id });
      }
    }

    ctx.logError(err, "Pipeline error", { slug });
    return apiError(500, "pipeline_failed", "An unexpected error occurred");
  }
}


