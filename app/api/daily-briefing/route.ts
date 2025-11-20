import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { BILH_SLUG } from "@/config/constants";
import { getDailyInputs } from "@/lib/getDailyInputs";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type DailyBriefingPayload = {
  bullets: string[];
  narrative: string;
};

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/daily-briefing");
  ctx.logInfo("Daily briefing generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `daily-briefing:${ip}`,
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
      slug: z.string().min(1).max(100).optional(),
    });

    let slug = BILH_SLUG;
    try {
      const body = await parseJsonBody(request, postSchema);
      if (body.slug) {
        slug = body.slug;
      }
    } catch {
      // If validation fails, use default slug
    }

  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (systemError || !system) {
    return apiError(404, "system_not_found", "System not found");
  }

  const { signals, documents } = await getDailyInputs(supabase, system.id);

  if (signals.length === 0 && documents.length === 0) {
    // Log no recent activity
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "no_recent_activity",
      });
    } catch (logError) {
      ctx.logError(logError, "Failed to log daily briefing run", { systemId: system.id });
    }
    ctx.logInfo("Daily briefing skipped - no recent activity", { systemId: system.id });
    return apiSuccess({ created: false, reason: "no_recent_activity" });
  }

  const signalLines = signals.map(
    (signal) =>
      `- [${signal.category}] (${signal.severity}) ${signal.summary ?? ""}`,
  );

  const documentLines = documents.map(
    (document) =>
      `- ${document.title ?? "Untitled"} — ${document.sourceUrl}`,
  );

  const prompt = [
    "You are a briefing assistant summarizing healthcare system activity. Respond with concise JSON.",
    `System: ${system.name}`,
    "Signals from last 24 hours:",
    signalLines.join("\n") || "- None",
    "Documents from last 24 hours:",
    documentLines.join("\n") || "- None",
    "Produce a JSON object with keys `bullets` (array of short bullet strings) and `narrative` (succinct paragraph). Be specific and avoid repetition.",
  ].join("\n\n");

  const response = await createResponse({
    prompt,
    format: "json_object",
  });

  const rawOutput = extractTextFromResponse(response);

  if (!rawOutput) {
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: "model_response_missing",
      });
    } catch (logError) {
      ctx.logError(logError, "Failed to log daily briefing run", { systemId: system.id });
    }
    ctx.logError(new Error("Model response missing"), "Model response missing", { systemId: system.id });
    return apiError(502, "generation_failed", "Model response missing");
  }

  let parsed: DailyBriefingPayload;

  try {
    parsed = JSON.parse(rawOutput) as DailyBriefingPayload;
  } catch (error) {
    ctx.logError(error, "Failed to parse model output", { rawOutput, systemId: system.id });
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: `model_response_invalid: ${String(error)}`,
      });
    } catch (logError) {
      ctx.logError(logError, "Failed to log daily briefing run", { systemId: system.id });
    }
    return apiError(502, "generation_failed", "Model response invalid");
  }

  if (!Array.isArray(parsed.bullets) || typeof parsed.narrative !== "string") {
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: "model_response_unexpected",
      });
    } catch (logError) {
      ctx.logError(logError, "Failed to log daily briefing run", { systemId: system.id });
    }
    ctx.logError(new Error("Invalid response structure"), "Invalid response structure", { systemId: system.id });
    return apiError(502, "generation_failed", "Model response unexpected structure");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("daily_briefings")
    .insert({
      system_id: system.id,
      summary: JSON.stringify(parsed),
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError || !inserted) {
    ctx.logError(insertError, "Failed to store daily briefing", { systemId: system.id });
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: `storage_failed: ${String(insertError)}`,
      });
    } catch (logError) {
      ctx.logError(logError, "Failed to log daily briefing run", { systemId: system.id });
    }
    return apiError(500, "storage_failed", "Failed to store daily briefing");
  }

  // Log success
  try {
    await supabase.from("daily_briefing_runs").insert({
      system_id: system.id,
      status: "success",
      briefing_id: inserted.id,
    });
  } catch (logError) {
    ctx.logError(logError, "Failed to log daily briefing run", { systemId: system.id });
  }

  ctx.logInfo("Daily briefing generated successfully", { systemId: system.id, briefingId: inserted.id });
  return apiSuccess({
    created: true,
    briefingId: inserted.id,
  });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Daily briefing generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

