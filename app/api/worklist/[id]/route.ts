import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { updateWorkItemStatus, type WorkItemStatus } from "@/lib/worklist";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = createRequestContext(`/api/worklist/${id}`);
  ctx.logInfo("Worklist update request received", { workItemId: id });

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `worklist-patch:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {

    const worklistPatchSchema = z.object({
      status: z.enum(["open", "snoozed", "done", "dropped"]),
      snoozeDays: z.number().int().positive().optional(),
    });

    const body = await parseJsonBody(request, worklistPatchSchema);

    const supabase = createServerSupabaseClient();
    const item = await updateWorkItemStatus(
      supabase,
      id,
      body.status as WorkItemStatus,
      { snoozeDays: body.snoozeDays },
    );

    if (!item) {
      return apiError(404, "not_found", "Work item not found");
    }

    ctx.logInfo("Work item updated successfully", { workItemId: id, status: item.status });
    return apiSuccess({ item });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Worklist PATCH API error", { workItemId: id });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

