import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { getSignalActionContext } from "@/lib/getSignalActionContext";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type ActionItem = {
  category: string;
  description: string;
  confidence: number;
};

type SignalActionsResponse = {
  actions: ActionItem[];
};

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/signal-actions");
  ctx.logInfo("Signal actions generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `signal-actions:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {

    const signalActionsPostSchema = z.object({
      slug: z.string().min(1).max(100),
      signalId: z.string().uuid(),
      mode: z.literal("generate"),
    });

    const body = await parseJsonBody(request, signalActionsPostSchema);

    // Extract signalId after validation to narrow type
    const signalId = body.signalId;

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string; slug: string; name: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const context = await getSignalActionContext(supabase, system.id, signalId);

    // Build compact model input
    const systemInfo = [
      `System: ${context.system.name}`,
      context.system.hq_city && context.system.hq_state
        ? `Location: ${context.system.hq_city}, ${context.system.hq_state}`
        : "",
      context.system.website ? `Website: ${context.system.website}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const signalInfo = [
      `Signal Category: ${context.signal.category ?? "unknown"}`,
      `Signal Severity: ${context.signal.severity ?? "unknown"}`,
      `Signal Summary: ${context.signal.summary}`,
      `Signal Created: ${context.signal.created_at ?? "unknown"}`,
    ].join("\n");

    const contactLines = context.contacts.map(
      (c) =>
        `- ${c.full_name}${c.title ? ` (${c.title})` : ""}${c.department ? ` - ${c.department}` : ""}${c.role_in_deal ? ` [${c.role_in_deal}]` : ""}${c.seniority ? ` (${c.seniority})` : ""}${c.is_primary ? " [PRIMARY]" : ""}`,
    );

    const opportunityLines = context.opportunities.map(
      (opp) =>
        `- [${opp.status}] ${opp.title}: ${opp.description ?? "No description"}`,
    );

    let accountPlanContext = "";
    if (context.accountPlan?.summary) {
      try {
        const planSummary = context.accountPlan.summary as {
          account_overview?: string;
          business_objectives?: string[];
          opportunity_themes?: string[];
          strategy_and_plays?: string[];
        };
        accountPlanContext = [
          planSummary.account_overview
            ? `Account Overview: ${planSummary.account_overview}`
            : "",
          planSummary.business_objectives && Array.isArray(planSummary.business_objectives)
            ? `Business Objectives: ${planSummary.business_objectives.join(", ")}`
            : "",
          planSummary.opportunity_themes && Array.isArray(planSummary.opportunity_themes)
            ? `Opportunity Themes: ${planSummary.opportunity_themes.join(", ")}`
            : "",
          planSummary.strategy_and_plays && Array.isArray(planSummary.strategy_and_plays)
            ? `Strategy & Plays: ${planSummary.strategy_and_plays.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch {
        // Ignore parsing errors
      }
    }

    let playbookContext = "";
    if (context.outboundPlaybook?.summary) {
      try {
        const playbookSummary = context.outboundPlaybook.summary as {
          outbound_brief?: string;
          call_talk_tracks?: string[];
          next_actions?: string[];
        };
        playbookContext = [
          playbookSummary.outbound_brief
            ? `Outbound Brief: ${playbookSummary.outbound_brief}`
            : "",
          playbookSummary.call_talk_tracks && Array.isArray(playbookSummary.call_talk_tracks)
            ? `Call Talk Tracks: ${playbookSummary.call_talk_tracks.join(" | ")}`
            : "",
          playbookSummary.next_actions && Array.isArray(playbookSummary.next_actions)
            ? `Next Actions: ${playbookSummary.next_actions.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch {
        // Ignore parsing errors
      }
    }

    const prompt = [
      "You are a healthcare IT sales strategist. Based on the signal and system context provided, generate 3–7 recommended sales actions. Use short, specific, actionable language. Output valid JSON only.",
      systemInfo,
      "\nSignal Details:",
      signalInfo,
      "\nRelevant Contacts:",
      contactLines.length > 0 ? contactLines.join("\n") : "- None",
      "\nOpen/In-Progress Opportunities:",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      accountPlanContext ? `\nAccount Plan:\n${accountPlanContext}` : "",
      playbookContext ? `\nOutbound Playbook:\n${playbookContext}` : "",
      "\nGenerate a JSON object with the following structure:",
      JSON.stringify({
        actions: [
          {
            category: "string (e.g. 'reach_out', 'research', 'follow_up', 'update_strategy')",
            description: "string (short, specific, actionable)",
            confidence: "integer (1-100)",
          },
        ],
      }),
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      ctx.logError(new Error("Model response missing"), "Model response missing", { systemId: system.id, signalId });
      return apiError(502, "generation_failed", "Failed to generate signal actions");
    }

    let parsed: SignalActionsResponse;

    try {
      parsed = JSON.parse(rawOutput) as SignalActionsResponse;
    } catch (error) {
      ctx.logError(error, "Failed to parse model output", { rawOutput, systemId: system.id, signalId });
      return apiError(502, "generation_failed", "Failed to parse model output");
    }

    // Validate structure
    if (!Array.isArray(parsed.actions)) {
      ctx.logError(new Error("Invalid actions structure"), "Invalid actions structure", { parsed, systemId: system.id, signalId });
      return apiError(502, "generation_failed", "Invalid response structure");
    }

    // Validate and insert each action
    const insertPromises = parsed.actions.map(async (action) => {
      if (
        typeof action.category !== "string" ||
        typeof action.description !== "string" ||
        typeof action.confidence !== "number" ||
        action.confidence < 1 ||
        action.confidence > 100
      ) {
        return null;
      }

      const { data, error } = await supabase
        .from("signal_actions")
        .insert({
          system_id: system.id,
          signal_id: signalId,
          action_category: action.category,
          action_description: action.description,
          confidence: action.confidence,
        })
        .select()
        .single();

      if (error) {
        ctx.logError(error, "Failed to insert signal action", { systemId: system.id, signalId });
        return null;
      }

      return data;
    });

    const insertedRows = (await Promise.all(insertPromises)).filter(
      (row) => row !== null,
    );

    if (insertedRows.length === 0) {
      ctx.logError(new Error("No valid actions generated"), "No valid actions generated", { systemId: system.id, signalId });
      return apiError(502, "generation_failed", "No valid actions were generated");
    }

    ctx.logInfo("Signal actions generated successfully", { systemId: system.id, signalId, count: insertedRows.length });
    return apiSuccess({ actions: insertedRows });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Signal actions generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/signal-actions");
  ctx.logInfo("Signal actions fetch request received");

  try {
    const signalActionsGetSchema = z.object({
      slug: z.string().min(1).max(100),
      limit: z.string().transform((val) => parseInt(val, 10)).default("50"),
      offset: z.string().transform((val) => parseInt(val, 10)).default("0"),
    });

    const validated = validateQuery(request.url, signalActionsGetSchema);
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

    const { data: items, error: itemsError, count } = await supabase
      .from("signal_actions")
      .select("id, system_id, signal_id, action_category, action_description, confidence, created_at", { count: "exact" })
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (itemsError) {
      ctx.logError(itemsError, "Failed to fetch signal actions", { slug, limit: safeLimit, offset: safeOffset });
      return apiError(500, "fetch_failed", "Failed to fetch signal actions");
    }

    ctx.logInfo("Signal actions fetched successfully", { slug, count: items?.length ?? 0 });
    return apiSuccess({
      signal_actions: items ?? [],
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total: count ?? 0,
        hasMore: (count ?? 0) > safeOffset + safeLimit,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Signal actions fetch error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

