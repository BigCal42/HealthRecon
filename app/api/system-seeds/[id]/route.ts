import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = createRequestContext(`/api/system-seeds/${id}`);
  ctx.logInfo("System seed update request received", { seedId: id });

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `seeds:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", {
      ip,
      resetAt: rateLimitResult.resetAt,
    });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {

    const updateSchema = z.object({
      url: z.string().url("Invalid URL format").optional(),
      label: z.string().nullable().optional(),
      priority: z.number().int().nullable().optional(),
      isActive: z.boolean().optional(),
    });

    const body = await parseJsonBody(request, updateSchema);

    const supabase = createServerSupabaseClient();

    // Build update object (map isActive to active)
    const updateData: {
      url?: string;
      label?: string | null;
      priority?: number | null;
      active?: boolean;
    } = {};

    if (body.url !== undefined) {
      updateData.url = body.url;
    }
    if (body.label !== undefined) {
      updateData.label = body.label;
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }
    if (body.isActive !== undefined) {
      updateData.active = body.isActive;
    }

    // Update seed
    const { data: updated, error: updateError } = await supabase
      .from("system_seeds")
      .update(updateData)
      .eq("id", id)
      .select("id, system_id, url, active, label, priority, last_crawled_at")
      .maybeSingle<{
        id: string;
        system_id: string;
        url: string;
        active: boolean;
        label: string | null;
        priority: number | null;
        last_crawled_at: string | null;
      }>();

    if (updateError) {
      ctx.logError(updateError, "Failed to update seed", { seedId: id });
      return apiError(500, "update_failed", "Failed to update seed");
    }

    if (!updated) {
      return apiError(404, "seed_not_found", "Seed not found");
    }

    // Map to SystemSeed format
    const seed = {
      id: updated.id,
      systemId: updated.system_id,
      url: updated.url,
      isActive: updated.active,
      label: updated.label ?? null,
      priority: updated.priority ?? null,
      lastCrawledAt: updated.last_crawled_at ?? null,
    };

    ctx.logInfo("System seed updated successfully", { seedId: id });
    return apiSuccess(seed);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "System seed update API error", { seedId: id });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = createRequestContext(`/api/system-seeds/${id}`);
  ctx.logInfo("System seed delete request received", { seedId: id });

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `seeds:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", {
      ip,
      resetAt: rateLimitResult.resetAt,
    });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const supabase = createServerSupabaseClient();

    // Hard delete seed
    const { error: deleteError } = await supabase
      .from("system_seeds")
      .delete()
      .eq("id", id);

    if (deleteError) {
      ctx.logError(deleteError, "Failed to delete seed", { seedId: id });
      return apiError(500, "delete_failed", "Failed to delete seed");
    }

    ctx.logInfo("System seed deleted successfully", { seedId: id });
    return apiSuccess({ ok: true });
  } catch (error) {
    ctx.logError(error, "System seed delete API error", { seedId: id });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

