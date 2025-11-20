import { apiError, apiSuccess } from "@/lib/api/error";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { createRequestContext } from "@/lib/apiLogging";
import { checkRateLimit } from "@/lib/rateLimit";
import { createWorkItemFromFocus, getWorkItems, type WorkItemStatus } from "@/lib/worklist";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { z } from "zod";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/worklist");
  ctx.logInfo("Worklist GET request received");

  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await checkRateLimit({
      key: `worklist-get:${ip}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
      return apiError(429, "rate_limited", "Rate limit exceeded.");
    }

    const worklistGetSchema = z.object({
      status: z.enum(["open", "snoozed", "done", "dropped"]).optional(),
    });

    let status: WorkItemStatus | undefined;
    try {
      const validated = validateQuery(request.url, worklistGetSchema);
      status = validated.status;
    } catch (error) {
      // If validation fails, continue without status filter
      if (error instanceof Response) {
        return error;
      }
    }

    const supabase = createServerSupabaseClient();
    const items = await getWorkItems(supabase, status ? { status } : undefined);

    ctx.logInfo("Worklist GET completed", { itemsCount: items.length, status });
    return apiSuccess({ items });
  } catch (error) {
    ctx.logError(error, "Worklist GET API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/worklist");
  ctx.logInfo("Worklist POST request received");

  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await checkRateLimit({
      key: `worklist-post:${ip}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
      return apiError(429, "rate_limited", "Rate limit exceeded.");
    }

    const worklistPostSchema = z.object({
      fromFocusItem: z.object({
        id: z.string().uuid(),
        type: z.enum(["signal_action", "opportunity", "interaction", "system"]),
        systemId: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
      }),
      defaultDueDays: z.number().int().positive().optional(),
    });

    const body = await parseJsonBody(request, worklistPostSchema);

    const supabase = createServerSupabaseClient();
    const item = await createWorkItemFromFocus(
      supabase,
      {
        id: body.fromFocusItem.id,
        type: body.fromFocusItem.type,
        systemId: body.fromFocusItem.systemId,
        systemSlug: "", // Not needed for creation
        systemName: "", // Not needed for creation
        title: body.fromFocusItem.title,
        description: body.fromFocusItem.description ?? null,
      },
      { defaultDueDays: body.defaultDueDays },
    );

    ctx.logInfo("Worklist POST completed", { itemId: item.id, type: body.fromFocusItem.type });
    return apiSuccess({ item });
  } catch (error) {
    ctx.logError(error, "Worklist POST API error");
    if (error instanceof Response) {
      return error;
    }
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

