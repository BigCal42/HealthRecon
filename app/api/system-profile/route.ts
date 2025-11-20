import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { getSystemProfileContext } from "@/lib/getSystemProfileContext";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type SystemProfilePayload = {
  executive_summary: string;
  key_leadership: string[];
  strategic_priorities: string[];
  technology_landscape: string[];
  recent_signals: string[];
  opportunities_summary: string[];
  risk_factors: string[];
};

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/system-profile");
  ctx.logInfo("System profile generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `system-profile:${ip}`,
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
    });

    const body = await parseJsonBody(request, postSchema);

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name, website")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string; slug: string; name: string; website: string | null }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const context = await getSystemProfileContext(supabase, system.id);

    // Build compact context for the model
    const signalSummaries = context.signals.map(
      (signal) =>
        `[${signal.category ?? "unknown"}] (${signal.severity ?? "unknown"}) ${signal.summary ?? ""}`,
    );

    const entitySummaries = context.entities.map(
      (entity) => `${entity.name} (${entity.type}${entity.role ? ` - ${entity.role}` : ""})`,
    );

    const newsSummaries = context.news.map((article) => {
      const truncatedText =
        (article.raw_text ?? "").length > 500
          ? (article.raw_text ?? "").substring(0, 500) + "..."
          : article.raw_text ?? "";
      return `${article.title ?? "Untitled"}: ${truncatedText}`;
    });

    const opportunitySummaries = context.opportunities.map(
      (opp) => `${opp.title} (${opp.status})`,
    );

    let briefingNarrative = "";
    if (context.briefing?.summary) {
      try {
        const parsedBriefing = JSON.parse(context.briefing.summary) as {
          narrative?: string;
        };
        briefingNarrative = parsedBriefing.narrative ?? "";
      } catch {
        // Ignore parsing errors
      }
    }

    const prompt = [
      "You generate a structured knowledge profile of a healthcare system. Output valid JSON only.",
      `System Name: ${system.name}`,
      system.website ? `Website: ${system.website}` : "",
      "Signals:",
      signalSummaries.length > 0 ? signalSummaries.join("\n") : "- None",
      "Entities:",
      entitySummaries.length > 0 ? entitySummaries.join("\n") : "- None",
      "Recent News:",
      newsSummaries.length > 0 ? newsSummaries.join("\n\n") : "- None",
      "Open Opportunities:",
      opportunitySummaries.length > 0 ? opportunitySummaries.join("\n") : "- None",
      "Latest Briefing Narrative:",
      briefingNarrative || "- None",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        executive_summary: "string",
        key_leadership: ["string"],
        strategic_priorities: ["string"],
        technology_landscape: ["string"],
        recent_signals: ["string"],
        opportunities_summary: ["string"],
        risk_factors: ["string"],
      }),
    ]
      .filter(Boolean)
      .join("\n\n");

    // Cap prompt length to prevent excessive token usage
    const cappedPrompt = capPromptLength(prompt);

    const response = await createResponse({
      prompt: cappedPrompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      return apiError(502, "generation_failed", "Model response missing");
    }

    let parsed: SystemProfilePayload;

    try {
      parsed = JSON.parse(rawOutput) as SystemProfilePayload;
    } catch (error) {
      ctx.logError(error, "Failed to parse model output", { rawOutput, systemId: system.id });
      return apiError(502, "generation_failed", "Failed to parse model output");
    }

    // Validate structure
    if (
      typeof parsed.executive_summary !== "string" ||
      !Array.isArray(parsed.key_leadership) ||
      !Array.isArray(parsed.strategic_priorities) ||
      !Array.isArray(parsed.technology_landscape) ||
      !Array.isArray(parsed.recent_signals) ||
      !Array.isArray(parsed.opportunities_summary) ||
      !Array.isArray(parsed.risk_factors)
    ) {
      return apiError(502, "generation_failed", "Invalid response structure");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("system_profiles")
      .insert({
        system_id: system.id,
        summary: parsed,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (insertError || !inserted) {
      ctx.logError(insertError, "Failed to store system profile", { systemId: system.id });
      return apiError(500, "generation_failed", "Failed to save system profile");
    }

    ctx.logInfo("System profile generated successfully", { systemId: system.id, profileId: inserted.id });
    return apiSuccess({
      profileId: inserted.id,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "System profile generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/system-profile");
  ctx.logInfo("System profile fetch request received");

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

    const { data: profile, error: profileError } = await supabase
      .from("system_profiles")
      .select("id, system_id, summary, created_at")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        system_id: string;
        summary: SystemProfilePayload;
        created_at: string;
      }>();

    if (profileError) {
      ctx.logError(profileError, "Failed to fetch system profile", { systemId: system.id });
      return apiError(500, "fetch_failed", "Failed to fetch system profile");
    }

    ctx.logInfo("System profile fetched successfully", { systemId: system.id, hasProfile: !!profile });
    return apiSuccess({ profile: profile ?? null });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "System profile fetch error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

