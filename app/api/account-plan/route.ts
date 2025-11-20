import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import {
  type AccountPlanSummary,
  type AccountPlanUpdateInput,
  getAccountPlanView,
  transformAccountPlanSummary,
  upsertAccountPlan,
} from "@/lib/accountPlan";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integrations
export const runtime = "nodejs";

const getSchema = z.object({
  systemSlug: z.string().min(1),
});

const updateSchema = z.object({
  systemSlug: z.string().min(1),
  summary: z.object({
    account_overview: z.string(),
    business_objectives: z.array(z.string()),
    current_state: z.array(z.string()),
    key_stakeholders: z.array(z.string()),
    opportunity_themes: z.array(z.string()),
    risks_and_blocks: z.array(z.string()),
    strategy_and_plays: z.array(z.string()),
    near_term_actions: z.array(z.string()),
  }),
});

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/account-plan");
  ctx.logInfo("Account plan fetch request received");

  try {
    const { systemSlug } = validateQuery(request.url, getSchema);

    const supabase = createServerSupabaseClient();
    const view = await getAccountPlanView(supabase, systemSlug);

    if (!view) {
      ctx.logInfo("Account plan view not found", { systemSlug });
      return apiError(404, "not_found", "System or account plan not found");
    }

    ctx.logInfo("Account plan fetched successfully", {
      systemSlug,
      systemId: view.systemId,
      hasPlan: !!view.plan,
    });

    return apiSuccess({ data: view });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Account plan fetch error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/account-plan");
  ctx.logInfo("Account plan update request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `account-plan:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", {
      ip,
      resetAt: rateLimitResult.resetAt,
    });
    return apiError(429, "rate_limited", "Rate limit exceeded");
  }

  try {
    const body = await parseJsonBody(request, updateSchema);

    const supabase = createServerSupabaseClient();

    // Verify system exists
    const existingView = await getAccountPlanView(supabase, body.systemSlug);
    if (!existingView) {
      return apiError(404, "system_not_found", "System not found");
    }

    const updateInput: AccountPlanUpdateInput = {
      summary: body.summary,
    };

    const updatedPlan = await upsertAccountPlan(supabase, body.systemSlug, updateInput);

    ctx.logInfo("Account plan updated successfully", {
      systemSlug: body.systemSlug,
      planId: updatedPlan.id,
    });

    return apiSuccess({ data: updatedPlan });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Account plan update error");
    return apiError(500, "update_failed", "Failed to update account plan");
  }
}

