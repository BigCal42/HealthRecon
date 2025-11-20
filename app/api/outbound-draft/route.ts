import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { getOutboundContext } from "@/lib/getOutboundContext";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

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
  const ctx = createRequestContext("/api/outbound-draft");
  ctx.logInfo("Outbound draft generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `outbound-draft:${ip}`,
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
      kind: z.enum(["email", "call"]),
      note: z.string().max(2000).optional(),
    });

    const body = await parseJsonBody(request, postSchema);

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string; slug: string; name: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const context = await getOutboundContext(supabase, system.id);

    // Optionally fetch latest playbook
    const { data: playbookRow } = await supabase
      .from("outbound_playbooks")
      .select("id, system_id, summary, created_at")
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
      ctx.logError(new Error("Model response missing"), "Model response missing", { systemId: system.id, kind: body.kind });
      return apiError(502, "generation_failed", "Failed to generate draft");
    }

    let parsed: EmailDraft | CallDraft;

    try {
      parsed = JSON.parse(rawOutput) as EmailDraft | CallDraft;
    } catch (error) {
      ctx.logError(error, "Failed to parse model output", { rawOutput, systemId: system.id, kind: body.kind });
      return apiError(502, "generation_failed", "Failed to parse draft response");
    }

    // Validate structure based on kind
    if (body.kind === "email") {
      const emailDraft = parsed as EmailDraft;
      if (
        typeof emailDraft.subject !== "string" ||
        typeof emailDraft.body !== "string"
      ) {
        ctx.logError(new Error("Invalid email draft structure"), "Invalid email draft structure", { parsed, systemId: system.id });
        return apiError(502, "generation_failed", "Invalid email draft structure");
      }
      ctx.logInfo("Email draft generated successfully", { systemId: system.id });
      return apiSuccess({
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
        ctx.logError(new Error("Invalid call draft structure"), "Invalid call draft structure", { parsed, systemId: system.id });
        return apiError(502, "generation_failed", "Invalid call draft structure");
      }
      ctx.logInfo("Call draft generated successfully", { systemId: system.id });
      return apiSuccess({
        kind: "call" as const,
        draft: callDraft,
      });
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Outbound draft generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

