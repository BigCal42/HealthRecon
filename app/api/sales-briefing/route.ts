import { NextResponse } from "next/server";

import { getSalesBriefingContext } from "@/lib/getSalesBriefingContext";
import { logger } from "@/lib/logger";
import { createResponse } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const supabase = createServerSupabaseClient();

    if (date) {
      // Fetch briefing for specific date
      const { data: briefing, error } = await supabase
        .from("sales_briefings")
        .select("*")
        .eq("generated_for_date", date)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error(error, "Failed to fetch briefing");
        return NextResponse.json(
          { error: "fetch_failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({ briefing });
    } else {
      // Fetch most recent briefing
      const { data: briefing, error } = await supabase
        .from("sales_briefings")
        .select("*")
        .order("generated_for_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error(error, "Failed to fetch briefing");
        return NextResponse.json(
          { error: "fetch_failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({ briefing });
    }
  } catch (error) {
    logger.error(error, "GET /api/sales-briefing error");
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    let forDate: Date;

    try {
      const body = (await request.json()) as { date?: string };
      if (body?.date) {
        forDate = new Date(body.date);
        if (isNaN(forDate.getTime())) {
          return NextResponse.json(
            { ok: false, error: "invalid_date" },
            { status: 400 },
          );
        }
      } else {
        // Default to yesterday in UTC
        forDate = new Date();
        forDate.setUTCDate(forDate.getUTCDate() - 1);
      }
    } catch {
      // Default to yesterday in UTC
      forDate = new Date();
      forDate.setUTCDate(forDate.getUTCDate() - 1);
    }

    const supabase = createServerSupabaseClient();

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

    // Call OpenAI
    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput =
      (response as any)?.output_text ??
      (response as any)?.output?.[0]?.content?.[0]?.text;

    if (!rawOutput) {
      logger.error("OpenAI response missing text output");
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    let parsed: SalesBriefingSummary;

    try {
      parsed = JSON.parse(rawOutput) as SalesBriefingSummary;
    } catch (error) {
      logger.error(error, "Failed to parse briefing JSON", rawOutput);
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
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
      logger.error("Invalid briefing structure", parsed);
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    // Insert into database
    const { data: inserted, error: insertError } = await supabase
      .from("sales_briefings")
      .insert({
        generated_for_date: context.forDate,
        summary: parsed,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      logger.error(insertError, "Failed to insert sales briefing");
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      briefing: inserted,
    });
  } catch (error) {
    logger.error(error, "POST /api/sales-briefing error");
    return NextResponse.json(
      { ok: false, error: "generation_failed" },
      { status: 500 },
    );
  }
}

