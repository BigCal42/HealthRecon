import { NextResponse } from "next/server";

import { BILH_SLUG } from "@/config/constants";
import { getDailyInputs } from "@/lib/getDailyInputs";
import { logger } from "@/lib/logger";
import { createResponse } from "@/lib/openaiClient";
import { rateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type DailyBriefingPayload = {
  bullets: string[];
  narrative: string;
};

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const ok = rateLimit({
    key: `post:${ip}:${request.url}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!ok) {
    logger.warn("Rate limit exceeded", { ip, url: request.url });
    return new Response("Too Many Requests", { status: 429 });
  }
  const supabase = createServerSupabaseClient();

  let slug = BILH_SLUG;

  try {
    const body = await request.json();
    if (body && typeof body === "object" && typeof body.slug === "string") {
      slug = body.slug;
    }
  } catch {
    // Ignore invalid / missing JSON bodies, default slug applies.
  }

  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (systemError || !system) {
    return NextResponse.json(
      { error: "system_not_found" },
      { status: 404 },
    );
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
      logger.error(logError, "Failed to log daily briefing run");
    }
    return NextResponse.json({ created: false, reason: "no_recent_activity" });
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

  const rawOutput =
    (response as any)?.output_text ??
    (response as any)?.output?.[0]?.content?.[0]?.text;

  if (!rawOutput) {
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: "model_response_missing",
      });
    } catch (logError) {
      logger.error(logError, "Failed to log daily briefing run");
    }
    return NextResponse.json(
      { error: "model_response_missing" },
      { status: 502 },
    );
  }

  let parsed: DailyBriefingPayload;

  try {
    parsed = JSON.parse(rawOutput) as DailyBriefingPayload;
  } catch (error) {
    logger.error(error, "Failed to parse model output", rawOutput);
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: `model_response_invalid: ${String(error)}`,
      });
    } catch (logError) {
      logger.error(logError, "Failed to log daily briefing run");
    }
    return NextResponse.json(
      { error: "model_response_invalid" },
      { status: 502 },
    );
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
      logger.error(logError, "Failed to log daily briefing run");
    }
    return NextResponse.json(
      { error: "model_response_unexpected" },
      { status: 502 },
    );
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
    logger.error(insertError, "Failed to store daily briefing");
    // Log error
    try {
      await supabase.from("daily_briefing_runs").insert({
        system_id: system.id,
        status: "error",
        error_message: `storage_failed: ${String(insertError)}`,
      });
    } catch (logError) {
      logger.error(logError, "Failed to log daily briefing run");
    }
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  // Log success
  try {
    await supabase.from("daily_briefing_runs").insert({
      system_id: system.id,
      status: "success",
      briefing_id: inserted.id,
    });
  } catch (logError) {
    logger.error(logError, "Failed to log daily briefing run");
  }

  return NextResponse.json({
    created: true,
    briefingId: inserted.id,
  });
}

