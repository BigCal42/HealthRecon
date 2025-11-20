import { apiError, apiSuccess } from "@/lib/api/error";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/validate";
import { createRequestContext } from "@/lib/apiLogging";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemIngestionConfig } from "@/lib/getSystemIngestionConfig";
import { z } from "zod";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = createRequestContext(`/api/systems/${slug}/seeds`);
  ctx.logInfo("System seeds GET request received", { systemSlug: slug });

  try {
    const supabase = createServerSupabaseClient();
    const config = await getSystemIngestionConfig(supabase, slug);

    if (!config) {
      return apiError(404, "system_not_found", "System not found");
    }

    ctx.logInfo("System seeds GET completed", { systemSlug: slug, seedsCount: config.seeds.length });
    return apiSuccess(config);
  } catch (error) {
    ctx.logError(error, "System seeds GET API error", { systemSlug: slug });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = createRequestContext(`/api/systems/${slug}/seeds`);
  ctx.logInfo("System seeds POST request received", { systemSlug: slug });

  try {
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

    const seedSchema = z.object({
      url: z.string().url("Invalid URL format"),
      label: z.string().nullable().optional(),
      priority: z.number().int().nullable().optional(),
      isActive: z.boolean().optional().default(true),
    });

    const body = await parseJsonBody(request, seedSchema);

    const supabase = createServerSupabaseClient();

    // Resolve system by slug
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    // Insert seed
    const { data: inserted, error: insertError } = await supabase
      .from("system_seeds")
      .insert({
        system_id: system.id,
        url: body.url,
        label: body.label ?? null,
        priority: body.priority ?? null,
        active: body.isActive,
      })
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

    if (insertError) {
      ctx.logError(insertError, "Failed to insert seed", { systemSlug: slug, url: body.url });
      return apiError(500, "insert_failed", "Failed to insert seed");
    }

    if (!inserted) {
      return apiError(500, "insert_failed", "Seed was not created");
    }

    // Map to SystemSeed format
    const seed = {
      id: inserted.id,
      systemId: inserted.system_id,
      url: inserted.url,
      isActive: inserted.active,
      label: inserted.label ?? null,
      priority: inserted.priority ?? null,
      lastCrawledAt: inserted.last_crawled_at ?? null,
    };

    ctx.logInfo("System seed created", { systemSlug: slug, seedId: seed.id });
    return apiSuccess(seed);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "System seeds POST API error", { systemSlug: slug });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

