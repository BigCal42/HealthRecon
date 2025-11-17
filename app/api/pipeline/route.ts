import { NextResponse } from "next/server";

import { BILH_SLUG } from "@/config/constants";
import { runIngestForSystem } from "@/lib/pipeline/ingest";
import { runProcessForSystem } from "@/lib/pipeline/process";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type PipelineError = "ingest_failed" | "process_failed";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  let slug = BILH_SLUG;

  try {
    const body = (await request.json()) as { slug?: string };
    if (body && typeof body === "object" && typeof body.slug === "string") {
      slug = body.slug;
    }
  } catch {
    // Ignore invalid / missing JSON bodies, default slug applies.
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
      console.error("Pipeline ingest error", err);
    }

    try {
      const processResult = await runProcessForSystem(supabase, slug);
      processSummary = processResult;
    } catch (err) {
      error = "process_failed";
      errorMessage = String(err);
      console.error("Pipeline process error", err);
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
        console.error("Failed to log pipeline run", logError);
      }
    }

    return NextResponse.json(responsePayload);
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
        console.error("Failed to log pipeline run error", logError);
      }
    }

    throw err;
  }
}


