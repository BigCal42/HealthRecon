import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateCronRequest } from "@/lib/cronAuth";
import { classifySystem } from "@/lib/classifySystem";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

/**
 * Cron endpoint for automated news classification.
 * Called by Vercel Cron every 6 hours.
 */
export async function GET(request: Request) {
  const ctx = createRequestContext("/api/cron/classify-news");
  ctx.logInfo("News classification cron job triggered");

  try {
    // Validate cron request
    try {
      validateCronRequest(request);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }

    const supabase = createServerSupabaseClient();

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, raw_text")
      .eq("source_type", "news")
      .is("system_id", null)
      .eq("processed", true)
      .limit(100); // Process up to 100 documents per run

    if (error) {
      ctx.logError(error, "Failed to load news documents");
      return apiError(500, "fetch_failed", "Failed to load news documents");
    }

    if (!docs || docs.length === 0) {
      ctx.logInfo("No unclassified news documents found");
      return apiSuccess({ classified: 0 });
    }

    let classified = 0;

    for (const doc of docs) {
      if (!doc.raw_text) {
        continue;
      }

      try {
        const slug = await classifySystem(doc.raw_text, supabase);

        if (!slug) {
          continue;
        }

        const { data: system } = await supabase
          .from("systems")
          .select("id")
          .eq("slug", slug)
          .maybeSingle<{ id: string }>();

        if (!system) {
          continue;
        }

        const { error: updateError } = await supabase
          .from("documents")
          .update({ system_id: system.id })
          .eq("id", doc.id);

        if (updateError) {
          ctx.logError(updateError, "Failed to update document system_id", { documentId: doc.id });
          continue;
        }

        classified++;
      } catch (error) {
        ctx.logError(error, "Failed to classify document", { documentId: doc.id });
        continue;
      }
    }

    ctx.logInfo("News classification cron completed", { classified, total: docs.length });
    return apiSuccess({ classified, total: docs.length });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "News classification cron error");
    return apiError(500, "cron_failed", "News classification cron job failed");
  }
}

