import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/interactions");
  ctx.logInfo("Interactions fetch request received");

  try {
    const interactionsGetSchema = z.object({
      slug: z.string().min(1).max(100),
      limit: z.string().transform((val) => parseInt(val, 10)).default("50"),
      offset: z.string().transform((val) => parseInt(val, 10)).default("0"),
    });

    const validated = validateQuery(request.url, interactionsGetSchema);
    const slug = validated.slug;
    const limit = validated.limit;
    const offset = validated.offset;

    // Enforce reasonable limits
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: interactions, error: interactionsError, count } = await supabase
      .from("interactions")
      .select("*", { count: "exact" })
      .eq("system_id", system.id)
      .order("occurred_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (interactionsError) {
      ctx.logError(interactionsError, "Failed to fetch interactions", { slug, limit: safeLimit, offset: safeOffset });
      return apiError(500, "fetch_failed", "Failed to fetch interactions");
    }

    ctx.logInfo("Interactions fetched successfully", { slug, count: interactions?.length ?? 0 });
    return apiSuccess({
      interactions: interactions ?? [],
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total: count ?? 0,
        hasMore: (count ?? 0) > safeOffset + safeLimit,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Interactions API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/interactions");
  ctx.logInfo("Interaction creation request received");

  try {
    const postSchema = z.object({
      slug: z.string().min(1).max(100),
      occurredAt: z.string().datetime().optional(),
      channel: z.string().min(1).max(50),
      subject: z.string().min(1).max(500),
      summary: z.string().min(1).max(5000),
      nextStep: z.string().max(500).optional(),
      nextStepDueAt: z.string().datetime().optional(),
    });

    const body = await parseJsonBody(request, postSchema);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { error: insertError } = await supabase.from("interactions").insert({
      system_id: system.id,
      occurred_at: body.occurredAt
        ? new Date(body.occurredAt).toISOString()
        : new Date().toISOString(),
      channel: body.channel,
      subject: body.subject,
      summary: body.summary,
      next_step: body.nextStep ?? null,
      next_step_due_at: body.nextStepDueAt
        ? new Date(body.nextStepDueAt).toISOString()
        : null,
    });

    if (insertError) {
      ctx.logError(insertError, "Failed to insert interaction", { slug: body.slug, systemId: system.id });
      return apiError(500, "insert_failed", "Failed to insert interaction");
    }

    ctx.logInfo("Interaction created successfully", { slug: body.slug, systemId: system.id });
    return apiSuccess({});
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Interactions API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

