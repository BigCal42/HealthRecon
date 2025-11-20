import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { BILH_SLUG } from "@/config/constants";
import { runProcessForSystem } from "@/lib/pipeline/process";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/process");
  ctx.logInfo("Process request received");

  try {
    const supabase = createServerSupabaseClient();

    const postSchema = z.object({
      slug: z.string().min(1).max(100).optional(),
    });

    let slug = BILH_SLUG;
    try {
      const body = await parseJsonBody(request, postSchema);
      if (body.slug) {
        slug = body.slug;
      }
    } catch {
      // If validation fails, use default slug
    }

    const result = await runProcessForSystem(supabase, slug);

    ctx.logInfo("Process completed successfully", { slug, processed: result.processed });
    return apiSuccess({ slug, processed: result.processed });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Processing error");
    return apiError(500, "processing_failed", "An unexpected error occurred");
  }
}

