import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { getSystemNarrativeContext } from "@/lib/getSystemNarrativeContext";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type SystemNarrativePayload = {
  headline: string;
  narrative_summary: string[];
  strategic_themes: string[];
  business_implications: string[];
  recommended_focus: string[];
  risks: string[];
  momentum_signals: string[];
};

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/system-narrative");
  ctx.logInfo("System narrative fetch request received");

  try {
    const getSchema = z.object({
      slug: z.string().min(1).max(100),
    });

    const validated = validateQuery(request.url, getSchema);
    const slug = validated.slug;

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: narrative, error: narrativeError } = await supabase
      .from("system_narratives")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        system_id: string;
        narrative: SystemNarrativePayload;
        created_at: string;
      }>();

    if (narrativeError) {
      ctx.logError(narrativeError, "Failed to fetch system narrative", { systemId: system.id });
      return apiError(500, "fetch_failed", "Failed to fetch system narrative");
    }

    ctx.logInfo("System narrative fetched successfully", { systemId: system.id, hasNarrative: !!narrative });
    return apiSuccess({ narrative: narrative ?? null });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "System narrative fetch error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/system-narrative");
  ctx.logInfo("System narrative generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `system-narrative:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const supabase = createServerSupabaseClient();

    const postSchema = z.object({
      slug: z.string().min(1).max(100),
      mode: z.literal("generate"),
    });

    const body = await parseJsonBody(request, postSchema);

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("slug", body.slug)
      .maybeSingle<{
        id: string;
        slug: string;
        name: string;
        website: string | null;
        hq_city: string | null;
        hq_state: string | null;
      }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const context = await getSystemNarrativeContext(supabase, system.id);

    // Build model input prompt
    const signalLines = context.signals
      .sort((a, b) => {
        // Sort by severity (high > medium > low) then recency
        const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const aSev = severityOrder[a.severity ?? "low"] ?? 1;
        const bSev = severityOrder[b.severity ?? "low"] ?? 1;
        if (aSev !== bSev) return bSev - aSev;
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .map(
        (signal) =>
          `- [${signal.category ?? "unknown"}] (${signal.severity ?? "unknown"}) ${signal.summary ?? ""} - ${signal.created_at ? new Date(signal.created_at).toLocaleDateString() : "unknown date"}`,
      );

    const newsLines = context.news.map((article) => {
      const truncatedText =
        (article.raw_text ?? "").length > 1000
          ? (article.raw_text ?? "").substring(0, 1000) + "..."
          : article.raw_text ?? "";
      return `- ${article.title ?? "Untitled"} (${article.crawled_at ? new Date(article.crawled_at).toLocaleDateString() : "unknown date"}): ${truncatedText}`;
    });

    const opportunityLines = context.opportunities.map(
      (opp) =>
        `- ${opp.title ?? "Untitled"} (${opp.status ?? "unknown"})${opp.description ? `: ${opp.description.substring(0, 200)}` : ""} - ${opp.created_at ? new Date(opp.created_at).toLocaleDateString() : "unknown date"}`,
    );

    const interactionLines = context.interactions.map(
      (interaction) =>
        `- [${interaction.channel ?? "unknown"}] ${interaction.subject ?? "No subject"}: ${interaction.summary ?? ""}${interaction.next_step ? ` | Next: ${interaction.next_step}` : ""} - ${interaction.occurred_at ? new Date(interaction.occurred_at).toLocaleDateString() : "unknown date"}`,
    );

    let accountPlanSummary = "";
    if (context.accountPlan?.summary) {
      try {
        const planData = context.accountPlan.summary as {
          key_objectives?: string[];
          strategic_initiatives?: string[];
          key_contacts?: string[];
        };
        const objectives = planData.key_objectives ?? [];
        const initiatives = planData.strategic_initiatives ?? [];
        accountPlanSummary = `Key Objectives: ${objectives.join("; ")}\nStrategic Initiatives: ${initiatives.join("; ")}`;
      } catch {
        accountPlanSummary = "Account plan available but structure unknown";
      }
    }

    let profileSummary = "";
    if (context.profile?.summary) {
      try {
        const profileData = context.profile.summary as {
          executive_summary?: string;
          strategic_priorities?: string[];
        };
        profileSummary = `Executive Summary: ${profileData.executive_summary ?? ""}\nStrategic Priorities: ${(profileData.strategic_priorities ?? []).join("; ")}`;
      } catch {
        profileSummary = "Profile available but structure unknown";
      }
    }

    const signalActionLines = context.signalActions.map(
      (action) =>
        `- [${action.action_category ?? "unknown"}] ${action.action_description ?? ""} - ${action.created_at ? new Date(action.created_at).toLocaleDateString() : "unknown date"}`,
    );

    const promptRaw = [
      "You are a healthcare strategy analyst. Produce a concise, structured narrative summarizing the state, trajectory, and strategic meaning of this health system. Capture both what is happening and why it matters for a healthcare IT services firm. Output valid JSON only.",
      `System: ${context.system.name}`,
      context.system.website ? `Website: ${context.system.website}` : "",
      context.system.hq_city && context.system.hq_state
        ? `Location: ${context.system.hq_city}, ${context.system.hq_state}`
        : "",
      "",
      "Signals (last 90 days, sorted by severity and recency):",
      signalLines.length > 0 ? signalLines.join("\n") : "- None",
      "",
      "News (last 90 days):",
      newsLines.length > 0 ? newsLines.join("\n\n") : "- None",
      "",
      "Opportunities (all):",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      "",
      "Interactions (last 30 days):",
      interactionLines.length > 0 ? interactionLines.join("\n") : "- None",
      "",
      "Account Plan:",
      accountPlanSummary || "- None",
      "",
      "System Profile:",
      profileSummary || "- None",
      "",
      "Signal Actions (last 30 days):",
      signalActionLines.length > 0 ? signalActionLines.join("\n") : "- None",
      "",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        headline: "string - one sentence capturing the current state",
        narrative_summary: ["string - 3-10 bullets telling the story"],
        strategic_themes: ["string - patterns, shifts, what's emerging"],
        business_implications: ["string - what this means for us"],
        recommended_focus: ["string - where to steer effort"],
        risks: ["string - account-level risks"],
        momentum_signals: ["string - signs of acceleration or deceleration"],
      }),
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = capPromptLength(promptRaw);

    const response = await createResponse({
      prompt,
      format: "json_object",
      model: "gpt-4.1-mini",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      return apiError(502, "generation_failed", "Model response missing");
    }

    let parsed: SystemNarrativePayload;

    try {
      parsed = JSON.parse(rawOutput) as SystemNarrativePayload;
    } catch (error) {
      ctx.logError(error, "Failed to parse model output", { rawOutput, systemId: system.id });
      return apiError(502, "generation_failed", "Failed to parse model output");
    }

    // Validate structure
    if (
      typeof parsed.headline !== "string" ||
      !Array.isArray(parsed.narrative_summary) ||
      !Array.isArray(parsed.strategic_themes) ||
      !Array.isArray(parsed.business_implications) ||
      !Array.isArray(parsed.recommended_focus) ||
      !Array.isArray(parsed.risks) ||
      !Array.isArray(parsed.momentum_signals)
    ) {
      return apiError(502, "generation_failed", "Invalid response structure");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("system_narratives")
      .insert({
        system_id: system.id,
        narrative: parsed,
      })
      .select("id, system_id, narrative, created_at")
      .single();

    if (insertError || !inserted) {
      ctx.logError(insertError, "Failed to store system narrative", { systemId: system.id });
      return apiError(500, "generation_failed", "Failed to save system narrative");
    }

    ctx.logInfo("System narrative generated successfully", { systemId: system.id, narrativeId: inserted.id });
    return apiSuccess({ narrative: inserted });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "System narrative generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

