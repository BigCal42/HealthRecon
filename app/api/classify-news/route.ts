import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { classifySystem } from "@/lib/classifySystem";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function POST() {
  const ctx = createRequestContext("/api/classify-news");
  ctx.logInfo("Classify news request received");

  try {
    const supabase = createServerSupabaseClient();

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, raw_text")
      .eq("source_type", "news")
      .is("system_id", null)
      .eq("processed", true);

    if (error) {
      ctx.logError(error, "Failed to load news documents");
      return apiError(500, "fetch_failed", "Failed to load news documents");
    }

    if (!docs || docs.length === 0) {
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

    ctx.logInfo("News classification completed successfully", { classified });
    return apiSuccess({ classified });
  } catch (error) {
    ctx.logError(error, "Classification error");
    return apiError(500, "classification_failed", "Unexpected server error");
  }
}

