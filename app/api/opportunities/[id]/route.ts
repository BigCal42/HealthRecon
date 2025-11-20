import { apiError, apiSuccess } from "@/lib/api/error";
import { parseJsonBody } from "@/lib/api/validate";
import { createRequestContext } from "@/lib/apiLogging";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { OPPORTUNITY_STAGES, type OpportunityStage } from "@/lib/opportunityStages";
import { z } from "zod";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

const updateOpportunitySchema = z.object({
  stage: z.enum([...OPPORTUNITY_STAGES] as [OpportunityStage, ...OpportunityStage[]]).optional(),
  priority: z.number().nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  closeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = createRequestContext(`/api/opportunities/${id}`);
  ctx.logInfo("Opportunity update request received", { opportunityId: id });

  try {
    if (!id || typeof id !== "string") {
      return apiError(400, "invalid_id", "Invalid opportunity ID");
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await checkRateLimit({
      key: `opportunity_update:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
      return apiError(429, "rate_limited", "Rate limit exceeded.");
    }

    const body = await parseJsonBody(request, updateOpportunitySchema);

    const supabase = createServerSupabaseClient();

    const updates: {
      stage?: string;
      priority?: number | null;
      probability?: number | null;
      close_date?: string | null;
    } = {};

    if (body.stage !== undefined) {
      updates.stage = body.stage;
    }
    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }
    if (body.probability !== undefined) {
      updates.probability = body.probability;
    }
    if (body.closeDate !== undefined) {
      updates.close_date = body.closeDate;
    }

    const { data, error } = await supabase
      .from("opportunities")
      .update(updates)
      .eq("id", id)
      .select("id, system_id, title, description, status, stage, priority, probability, close_date, source_kind, source_id, created_at, updated_at")
      .maybeSingle();

    if (error) {
      ctx.logError(error, "Failed to update opportunity", { opportunityId: id });
      return apiError(500, "update_failed", "Failed to update opportunity");
    }

    if (!data) {
      return apiError(404, "not_found", "Opportunity not found");
    }

    ctx.logInfo("Opportunity updated", { opportunityId: id, stage: data.stage });
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunity update API error", { opportunityId: id });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

