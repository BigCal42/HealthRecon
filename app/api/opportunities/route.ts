import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { checkRateLimit } from "@/lib/rateLimit";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/opportunities");
  ctx.logInfo("Opportunities fetch request received");

  try {
    const opportunitiesGetSchema = z.object({
      systemSlug: z.string().min(1).max(100),
    });

    const validated = validateQuery(request.url, opportunitiesGetSchema);
    const systemSlug = validated.systemSlug;

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", systemSlug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: opportunities, error: opportunitiesError } = await supabase
      .from("opportunities")
      .select("id, system_id, title, description, status, stage, priority, amount, currency, close_date, probability, source_kind, source_id, created_at, updated_at")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false });

    if (opportunitiesError) {
      ctx.logError(opportunitiesError, "Failed to fetch opportunities", { systemSlug });
      return apiError(500, "fetch_failed", "Failed to fetch opportunities");
    }

    ctx.logInfo("Opportunities fetched successfully", { systemSlug, count: opportunities?.length ?? 0 });
    return apiSuccess({
      opportunities: opportunities ?? [],
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunities API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/opportunities");
  ctx.logInfo("Opportunity upsert request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `opportunities:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const upsertSchema = z.object({
      systemSlug: z.string().min(1).max(100),
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(500),
      notes: z.string().max(5000).optional(),
      stage: z.string().min(1).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    });

    const body = await parseJsonBody(request, upsertSchema);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", body.systemSlug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    // Map priority enum to number (low=1, medium=5, high=10)
    const priorityMap: Record<string, number> = {
      low: 1,
      medium: 5,
      high: 10,
    };
    const priorityNumber = body.priority ? priorityMap[body.priority] : null;

    if (body.id) {
      // Update existing opportunity
      const { data: updated, error: updateError } = await supabase
        .from("opportunities")
        .update({
          title: body.title,
          description: body.notes ?? null,
          stage: body.stage ?? null,
          priority: priorityNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .eq("system_id", system.id)
        .select("id, system_id, title, description, status, stage, priority, amount, currency, close_date, probability, source_kind, source_id, created_at, updated_at")
        .single();

      if (updateError || !updated) {
        ctx.logError(updateError, "Failed to update opportunity", { systemSlug: body.systemSlug, id: body.id });
        return apiError(500, "update_failed", "Failed to update opportunity");
      }

      ctx.logInfo("Opportunity updated successfully", { systemSlug: body.systemSlug, id: body.id });
      return apiSuccess({ opportunity: updated });
    } else {
      // Insert new opportunity
      const { data: inserted, error: insertError } = await supabase
        .from("opportunities")
        .insert({
          system_id: system.id,
          title: body.title,
          description: body.notes ?? null,
          status: "open",
          stage: body.stage ?? null,
          priority: priorityNumber,
        })
        .select("id, system_id, title, description, status, stage, priority, amount, currency, close_date, probability, source_kind, source_id, created_at, updated_at")
        .single();

      if (insertError || !inserted) {
        ctx.logError(insertError, "Failed to insert opportunity", { systemSlug: body.systemSlug });
        return apiError(500, "insert_failed", "Failed to insert opportunity");
      }

      ctx.logInfo("Opportunity created successfully", { systemSlug: body.systemSlug, id: inserted.id });
      return apiSuccess({ opportunity: inserted });
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunities API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function DELETE(request: Request) {
  const ctx = createRequestContext("/api/opportunities");
  ctx.logInfo("Opportunity deletion request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `opportunities:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const deleteSchema = z.object({
      systemSlug: z.string().min(1).max(100),
      id: z.string().uuid(),
    });

    const validated = validateQuery(request.url, deleteSchema);
    const systemSlug = validated.systemSlug;
    const id = validated.id;

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", systemSlug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { error: deleteError } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", id)
      .eq("system_id", system.id);

    if (deleteError) {
      ctx.logError(deleteError, "Failed to delete opportunity", { systemSlug, id });
      return apiError(500, "delete_failed", "Failed to delete opportunity");
    }

    ctx.logInfo("Opportunity deleted successfully", { systemSlug, id });
    return apiSuccess({});
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunities API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

