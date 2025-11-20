import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/admin/system-seeds");
  ctx.logInfo("Admin system seeds fetch request received");

  try {
    const getSchema = z.object({
      slug: z.string().min(1).max(100),
    });

    const { slug } = validateQuery(request.url, getSchema);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: seeds, error: seedsError } = await supabase
      .from("system_seeds")
      .select("id, url, active, created_at")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false });

    if (seedsError) {
      ctx.logError(seedsError, "Failed to fetch seeds", { slug, systemId: system.id });
      return apiError(500, "fetch_failed", "Failed to fetch seeds");
    }

    ctx.logInfo("System seeds fetched successfully", { slug, count: seeds?.length ?? 0 });
    return apiSuccess({ seeds: seeds ?? [] });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "System seeds API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

import { parseJsonBody } from "@/lib/api/validate";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/admin/system-seeds");
  ctx.logInfo("Admin system seed creation request received");

  try {
    const postSchema = z.object({
      slug: z.string().min(1).max(100),
      url: z.string().url().max(2000),
      active: z.boolean().optional(),
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

    const { error: insertError } = await supabase.from("system_seeds").insert({
      system_id: system.id,
      url: body.url,
      active: body.active ?? true,
    });

    if (insertError) {
      ctx.logError(insertError, "Failed to insert seed", { slug: body.slug, systemId: system.id, url: body.url });
      return apiError(500, "insert_failed", "Failed to insert seed");
    }

    ctx.logInfo("System seed created successfully", { slug: body.slug, systemId: system.id });
    return apiSuccess({});
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "System seeds API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

