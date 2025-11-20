import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET() {
  const ctx = createRequestContext("/api/admin/systems");
  ctx.logInfo("Admin systems fetch request received");

  try {
    const supabase = createServerSupabaseClient();

    const { data: systems, error } = await supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .order("name", { ascending: true });

    if (error) {
      ctx.logError(error, "Failed to fetch systems");
      return apiError(500, "fetch_failed", "Failed to fetch systems");
    }

    ctx.logInfo("Systems fetched successfully", { count: systems?.length ?? 0 });
    return apiSuccess({ systems: systems ?? [] });
  } catch (error) {
    ctx.logError(error, "Systems API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

import { z } from "zod";

import { parseJsonBody } from "@/lib/api/validate";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/admin/systems");
  ctx.logInfo("Admin system creation request received");

  try {
    const postSchema = z.object({
      slug: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      website: z.string().url().max(500).optional(),
      hqCity: z.string().max(100).optional(),
      hqState: z.string().max(2).optional(),
    });

    const body = await parseJsonBody(request, postSchema);

    const supabase = createServerSupabaseClient();

    const { error: insertError } = await supabase.from("systems").insert({
      slug: body.slug,
      name: body.name,
      website: body.website ?? null,
      hq_city: body.hqCity ?? null,
      hq_state: body.hqState ?? null,
    });

    if (insertError) {
      ctx.logError(insertError, "Failed to insert system", { slug: body.slug });
      
      // Check for duplicate slug error
      if (insertError.code === "23505" || insertError.message.includes("unique")) {
        return apiError(400, "duplicate_slug", "Slug already exists");
      }

      return apiError(500, "insert_failed", "Failed to insert system");
    }

    ctx.logInfo("System created successfully", { slug: body.slug });
    return apiSuccess({});
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Systems API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

