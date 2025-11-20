import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/opportunity-suggestions/accept");
  ctx.logInfo("Opportunity suggestion accept request received");

  try {
    const supabase = createServerSupabaseClient();

    const postSchema = z.object({
      slug: z.string().min(1).max(100),
      suggestionId: z.string().uuid(),
    });

    const body = await parseJsonBody(request, postSchema);
    const slug = body.slug;
    const suggestionId = body.suggestionId;

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: suggestion, error: suggestionError } = await supabase
      .from("opportunity_suggestions")
      .select("id, system_id, title, description, source_kind, accepted")
      .eq("id", suggestionId)
      .maybeSingle<{
        id: string;
        system_id: string;
        title: string;
        description: string | null;
        source_kind: string | null;
        accepted: boolean;
      }>();

    if (suggestionError || !suggestion || suggestion.system_id !== system.id) {
      return apiError(404, "suggestion_not_found", "Suggestion not found");
    }

    if (suggestion.accepted) {
      return apiSuccess({ opportunityId: suggestionId });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("opportunities")
      .insert({
        system_id: system.id,
        title: suggestion.title,
        description: suggestion.description,
        status: "open",
        source_kind: suggestion.source_kind,
        source_id: suggestion.id,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (insertError || !inserted) {
      ctx.logError(insertError, "Failed to create opportunity from suggestion", { slug, suggestionId, systemId: system.id });
      return apiError(500, "insert_failed", "Failed to create opportunity");
    }

    const { error: updateError } = await supabase
      .from("opportunity_suggestions")
      .update({
        accepted: true,
        accepted_opportunity_id: inserted.id,
      })
      .eq("id", suggestionId);

    if (updateError) {
      ctx.logError(updateError, "Failed to mark suggestion accepted", { slug, suggestionId, opportunityId: inserted.id });
      return apiError(500, "update_failed", "Failed to mark suggestion accepted");
    }

    ctx.logInfo("Opportunity suggestion accepted successfully", { slug, suggestionId, opportunityId: inserted.id });
    return apiSuccess({ opportunityId: inserted.id });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunity suggestion accept error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

