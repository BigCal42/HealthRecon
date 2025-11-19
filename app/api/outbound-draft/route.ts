import { NextResponse } from "next/server";

import { getOutboundContext } from "@/lib/getOutboundContext";
import { logger } from "@/lib/logger";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { rateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type EmailDraft = {
  subject: string;
  body: string;
};

type CallDraft = {
  opening: string;
  discovery_questions: string[];
  value_narrative: string;
  closing: string;
};

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
    const body = (await request.json()) as {
      slug?: string;
      kind?: "email" | "call";
      note?: string;
    };

    if (!body.slug) {
      return NextResponse.json(
        { ok: false, error: "slug_required" },
        { status: 400 },
      );
    }

    if (!body.kind || (body.kind !== "email" && body.kind !== "call")) {
      return NextResponse.json(
        { ok: false, error: "kind_required" },
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

    // Optionally fetch latest playbook
    const { data: playbookRow } = await supabase
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

    // Build compact context string
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
      (opp) => `- ${opp.title ?? "Untitled"}: ${opp.status ?? "unknown"}`,
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

    let playbookContext = "";
    if (playbookRow?.summary) {
      const playbook = playbookRow.summary;
      const playbookParts = [
        playbook.outbound_brief ? `Outbound Brief: ${playbook.outbound_brief}` : "",
        playbook.call_talk_tracks && playbook.call_talk_tracks.length > 0
          ? `Call Talk Tracks: ${playbook.call_talk_tracks.slice(0, 3).join("; ")}`
          : "",
        playbook.email_openers && playbook.email_openers.length > 0
          ? `Email Openers: ${playbook.email_openers.slice(0, 3).join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      if (playbookParts) {
        playbookContext = `Outbound Playbook:\n${playbookParts}`;
      }
    }

    // Build user prompt with context
    const contextParts = [
      systemInfo,
      "Recent Signals:",
      signalLines.length > 0 ? signalLines.join("\n") : "- None",
      "Recent News:",
      newsLines.length > 0 ? newsLines.join("\n\n") : "- None",
      "Open Opportunities:",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      profileContext ? `System Profile:\n${profileContext}` : "",
      playbookContext ? playbookContext : "",
    ].filter(Boolean);

    const userPrompt = [
      ...contextParts,
      body.note ? `Seller's note / focus: ${body.note}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // System prompt varies by kind
    const systemPrompt =
      body.kind === "email"
        ? "You write concise, high-quality outbound sales emails to healthcare executives about IT/analytics/AI services. Output valid JSON only."
        : "You write concise, practical call talk tracks for sales calls with healthcare executives. Output valid JSON only.";

    // Build full prompt
    const prompt = [
      systemPrompt,
      userPrompt,
      body.kind === "email"
        ? `Generate a JSON object with this structure: ${JSON.stringify({ subject: "string", body: "string" })}`
        : `Generate a JSON object with this structure: ${JSON.stringify({ opening: "string", discovery_questions: ["string"], value_narrative: "string", closing: "string" })}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      logger.error("Model response missing", { systemId: system.id });
      return NextResponse.json(
        { ok: false, error: "draft_generation_failed" },
        { status: 502 },
      );
    }

    let parsed: EmailDraft | CallDraft;

    try {
      parsed = JSON.parse(rawOutput) as EmailDraft | CallDraft;
    } catch (error) {
      logger.error(error, "Failed to parse model output", rawOutput);
      return NextResponse.json(
        { ok: false, error: "draft_generation_failed" },
        { status: 502 },
      );
    }

    // Validate structure based on kind
    if (body.kind === "email") {
      const emailDraft = parsed as EmailDraft;
      if (
        typeof emailDraft.subject !== "string" ||
        typeof emailDraft.body !== "string"
      ) {
        logger.error("Invalid email draft structure", parsed);
        return NextResponse.json(
          { ok: false, error: "draft_generation_failed" },
          { status: 502 },
        );
      }
      return NextResponse.json({
        ok: true,
        kind: "email" as const,
        draft: emailDraft,
      });
    } else {
      const callDraft = parsed as CallDraft;
      if (
        typeof callDraft.opening !== "string" ||
        !Array.isArray(callDraft.discovery_questions) ||
        typeof callDraft.value_narrative !== "string" ||
        typeof callDraft.closing !== "string"
      ) {
        logger.error("Invalid call draft structure", parsed);
        return NextResponse.json(
          { ok: false, error: "draft_generation_failed" },
          { status: 502 },
        );
      }
      return NextResponse.json({
        ok: true,
        kind: "call" as const,
        draft: callDraft,
      });
    }
  } catch (error) {
    logger.error(error, "Outbound draft generation error");
    return NextResponse.json(
      { ok: false, error: "draft_generation_failed" },
      { status: 500 },
    );
  }
}

