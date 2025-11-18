import { NextResponse } from "next/server";

import { getOutboundContext } from "@/lib/getOutboundContext";
import { logger } from "@/lib/logger";
import { createResponse } from "@/lib/openaiClient";
import { rateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type OutboundPlaybookPayload = {
  outbound_brief: string;
  call_talk_tracks: string[];
  email_openers: string[];
  next_actions: string[];
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

  try {
    const body = (await request.json()) as { slug?: string };

    if (!body.slug) {
      return NextResponse.json(
        { ok: false, error: "slug_required" },
        { status: 400 },
      );
    }

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string; slug: string; name: string }>();

    if (systemError || !system) {
      return NextResponse.json(
        { ok: false, error: "system_not_found" },
        { status: 404 },
      );
    }

    const context = await getOutboundContext(supabase, system.id);

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

    const signalLines = context.signals.map(
      (signal) =>
        `- [${signal.category ?? "unknown"}] (${signal.severity ?? "unknown"}) ${signal.summary ?? ""}`,
    );

    const newsLines = context.news.map((article) => {
      const truncatedText =
        (article.raw_text ?? "").length > 500
          ? (article.raw_text ?? "").substring(0, 500) + "..."
          : article.raw_text ?? "";
      return `- ${article.title ?? "Untitled"}: ${truncatedText}`;
    });

    const opportunityLines = context.opportunities.map(
      (opp) => `- ${opp.title ?? "Untitled"}: ${opp.description ?? "No description"}`,
    );

    let profileContext = "";
    if (context.profile?.summary) {
      try {
        const profileSummary = context.profile.summary as {
          executive_summary?: string;
          strategic_priorities?: string[];
        };
        const execSummary = profileSummary.executive_summary ?? "";
        const priorities =
          Array.isArray(profileSummary.strategic_priorities)
            ? profileSummary.strategic_priorities.join(", ")
            : "";
        profileContext = [
          execSummary ? `Executive Summary: ${execSummary}` : "",
          priorities ? `Strategic Priorities: ${priorities}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch {
        // Ignore parsing errors
      }
    }

    const prompt = [
      "You are a healthcare IT sales strategist. Based on the context for a single health system, generate a structured outbound prep playbook for a seller. Output valid JSON only.",
      systemInfo,
      "Recent Signals:",
      signalLines.length > 0 ? signalLines.join("\n") : "- None",
      "Recent News:",
      newsLines.length > 0 ? newsLines.join("\n\n") : "- None",
      "Open Opportunities:",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      profileContext ? `System Profile:\n${profileContext}` : "",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        outbound_brief: "string (2-4 paragraphs)",
        call_talk_tracks: ["string (1-3 concise bullets/paragraphs)"],
        email_openers: ["string (1-3 suggested email openings)"],
        next_actions: ["string (concrete, actionable steps)"],
      }),
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput =
      (response as any)?.output_text ??
      (response as any)?.output?.[0]?.content?.[0]?.text;

    if (!rawOutput) {
      logger.error("Model response missing", { systemId: system.id });
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 502 },
      );
    }

    let parsed: OutboundPlaybookPayload;

    try {
      parsed = JSON.parse(rawOutput) as OutboundPlaybookPayload;
    } catch (error) {
      logger.error(error, "Failed to parse model output", rawOutput);
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 502 },
      );
    }

    // Validate structure
    if (
      typeof parsed.outbound_brief !== "string" ||
      !Array.isArray(parsed.call_talk_tracks) ||
      !Array.isArray(parsed.email_openers) ||
      !Array.isArray(parsed.next_actions)
    ) {
      logger.error("Invalid playbook structure", parsed);
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 502 },
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("outbound_playbooks")
      .insert({
        system_id: system.id,
        summary: parsed,
      })
      .select("*")
      .single<{ id: string }>();

    if (insertError || !inserted) {
      logger.error(insertError, "Failed to store outbound playbook");
      return NextResponse.json(
        { ok: false, error: "storage_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      playbookId: inserted.id,
    });
  } catch (error) {
    logger.error(error, "Outbound playbook generation error");
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "slug query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return NextResponse.json(
        { error: "system_not_found" },
        { status: 404 },
      );
    }

    const { data: playbook, error: playbookError } = await supabase
      .from("outbound_playbooks")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        system_id: string;
        summary: OutboundPlaybookPayload;
        created_at: string;
      }>();

    if (playbookError) {
      logger.error(playbookError, "Failed to fetch outbound playbook");
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ playbook: playbook ?? null });
  } catch (error) {
    logger.error(error, "Outbound playbook fetch error");
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

