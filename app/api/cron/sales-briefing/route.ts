import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateCronRequest } from "@/lib/cronAuth";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSalesBriefingContext } from "@/lib/getSalesBriefingContext";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type SalesBriefingSummary = {
  headline: string;
  date_label: string;
  portfolio_summary: string[];
  system_summaries: Array<{
    system_slug: string;
    system_name: string;
    key_points: string[];
    suggested_focus: string[];
  }>;
  suggested_todays_focus: string[];
  risks_or_watch_items: string[];
};

/**
 * Cron endpoint for automated sales briefing generation.
 * Called by Vercel Cron at 7 AM daily.
 */
export async function GET(request: Request) {
  const ctx = createRequestContext("/api/cron/sales-briefing");
  ctx.logInfo("Sales briefing cron job triggered");

  try {
    // Validate cron request
    try {
      validateCronRequest(request);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }

    const supabase = createServerSupabaseClient();

    // Default to yesterday in UTC
    const forDate = new Date();
    forDate.setUTCDate(forDate.getUTCDate() - 1);
    forDate.setUTCHours(0, 0, 0, 0);

    const forDateStr = forDate.toISOString().split("T")[0];

    // Check if briefing already exists for this date
    const { data: existingBriefing } = await supabase
      .from("sales_briefings")
      .select("id")
      .eq("generated_for_date", forDateStr)
      .limit(1)
      .maybeSingle();

    if (existingBriefing) {
      ctx.logInfo("Sales briefing already exists for date", { forDate: forDateStr });
      return apiSuccess({ skipped: true, reason: "briefing_already_exists", forDate: forDateStr });
    }

    // Get context for the date window
    const context = await getSalesBriefingContext(supabase, forDate);

    // Build system map for quick lookup
    const systemMap = new Map(
      context.systems.map((s) => [s.id, { slug: s.slug, name: s.name }]),
    );

    // Group events by system
    const systemEvents = new Map<
      string,
      {
        slug: string;
        name: string;
        signals: typeof context.signals;
        news: typeof context.news;
        opportunities: typeof context.opportunities;
        interactions: typeof context.interactions;
        signalActions: typeof context.signalActions;
      }
    >();

    for (const system of context.systems) {
      systemEvents.set(system.id, {
        slug: system.slug,
        name: system.name,
        signals: [],
        news: [],
        opportunities: [],
        interactions: [],
        signalActions: [],
      });
    }

    for (const signal of context.signals) {
      const events = systemEvents.get(signal.system_id);
      if (events) {
        events.signals.push(signal);
      }
    }

    for (const article of context.news) {
      const events = systemEvents.get(article.system_id);
      if (events) {
        events.news.push(article);
      }
    }

    for (const opp of context.opportunities) {
      const events = systemEvents.get(opp.system_id);
      if (events) {
        events.opportunities.push(opp);
      }
    }

    for (const interaction of context.interactions) {
      const events = systemEvents.get(interaction.system_id);
      if (events) {
        events.interactions.push(interaction);
      }
    }

    for (const action of context.signalActions) {
      const events = systemEvents.get(action.system_id);
      if (events) {
        events.signalActions.push(action);
      }
    }

    // Build LLM prompt
    const activeSystems = Array.from(systemEvents.values()).filter(
      (events) =>
        events.signals.length > 0 ||
        events.news.length > 0 ||
        events.opportunities.length > 0 ||
        events.interactions.length > 0 ||
        events.signalActions.length > 0,
    );

    const systemSummaries: string[] = [];

    for (const events of activeSystems) {
      const parts: string[] = [];
      parts.push(`System: ${events.name} (${events.slug})`);

      if (events.signals.length > 0) {
        parts.push(
          `Signals (${events.signals.length}): ${events.signals
            .slice(0, 5)
            .map(
              (s) =>
                `[${s.category}] ${s.severity}: ${s.summary.substring(0, 100)}`,
            )
            .join("; ")}`,
        );
      }

      if (events.news.length > 0) {
        parts.push(
          `News (${events.news.length}): ${events.news
            .slice(0, 5)
            .map((n) => n.title ?? "Untitled")
            .join("; ")}`,
        );
      }

      if (events.opportunities.length > 0) {
        parts.push(
          `New Opportunities (${events.opportunities.length}): ${events.opportunities
            .map((o) => `${o.title} (${o.status})`)
            .join("; ")}`,
        );
      }

      if (events.interactions.length > 0) {
        parts.push(
          `Interactions (${events.interactions.length}): ${events.interactions
            .slice(0, 5)
            .map(
              (i) =>
                `${i.channel}: ${i.subject ?? i.summary?.substring(0, 50) ?? "No subject"}`,
            )
            .join("; ")}`,
        );
      }

      if (events.signalActions.length > 0) {
        parts.push(
          `Signal Actions (${events.signalActions.length}): ${events.signalActions
            .slice(0, 5)
            .map(
              (a) =>
                `${a.action_category}: ${a.action_description.substring(0, 80)}`,
            )
            .join("; ")}`,
        );
      }

      systemSummaries.push(parts.join("\n"));
    }

    const prompt = [
      "You are a healthcare IT sales leader summarizing yesterday's activity across a portfolio of health systems. Based on the context, generate a concise sales briefing. Output valid JSON only.",
      "",
      `Date: ${context.forDate}`,
      "",
      `Total Systems: ${context.systems.length}`,
      `Systems with Activity: ${activeSystems.length}`,
      `Total Signals: ${context.signals.length}`,
      `Total News Articles: ${context.news.length}`,
      `New Opportunities: ${context.opportunities.length}`,
      `New Interactions: ${context.interactions.length}`,
      `New Signal Actions: ${context.signalActions.length}`,
      "",
      "System Activity Details:",
      systemSummaries.join("\n\n"),
      "",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        headline: "string - one-line summary",
        date_label: `string - e.g. "Sales Briefing for ${context.forDate}"`,
        portfolio_summary: ["string - 3-7 bullets across the entire book"],
        system_summaries: [
          {
            system_slug: "string",
            system_name: "string",
            key_points: ["string - 3-7 bullets"],
            suggested_focus: ["string - 2-5 bullets"],
          },
        ],
        suggested_todays_focus: ["string - global list of what to work on"],
        risks_or_watch_items: ["string - risk-level items across systems"],
      }),
    ].join("\n");

    // Cap prompt length to prevent excessive token usage
    const cappedPrompt = capPromptLength(prompt);

    // Call OpenAI
    const response = await createResponse({
      prompt: cappedPrompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      ctx.logError(new Error("OpenAI response missing text output"), "OpenAI response missing text output", { forDate: context.forDate });
      return apiError(502, "generation_failed", "Failed to generate briefing");
    }

    let parsed: SalesBriefingSummary;

    try {
      parsed = JSON.parse(rawOutput) as SalesBriefingSummary;
    } catch (error) {
      ctx.logError(error, "Failed to parse briefing JSON", { rawOutput, forDate: context.forDate });
      return apiError(502, "generation_failed", "Failed to parse briefing response");
    }

    // Validate structure
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.date_label !== "string" ||
      !Array.isArray(parsed.portfolio_summary) ||
      !Array.isArray(parsed.system_summaries) ||
      !Array.isArray(parsed.suggested_todays_focus) ||
      !Array.isArray(parsed.risks_or_watch_items)
    ) {
      ctx.logError(new Error("Invalid briefing structure"), "Invalid briefing structure", { parsed, forDate: context.forDate });
      return apiError(502, "generation_failed", "Invalid briefing structure");
    }

    // Insert into database
    const { data: inserted, error: insertError } = await supabase
      .from("sales_briefings")
      .insert({
        generated_for_date: context.forDate,
        summary: parsed,
      })
      .select("id, generated_for_date, summary, created_at")
      .single();

    if (insertError || !inserted) {
      ctx.logError(insertError, "Failed to insert sales briefing", { forDate: context.forDate });
      return apiError(500, "generation_failed", "Failed to save briefing");
    }

    ctx.logInfo("Sales briefing cron completed successfully", { forDate: context.forDate, briefingId: inserted.id });
    return apiSuccess({ briefing: inserted });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Sales briefing cron error");
    return apiError(500, "cron_failed", "Sales briefing cron job failed");
  }
}

