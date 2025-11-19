import { NextResponse } from "next/server";

import { getSignalActionContext } from "@/lib/getSignalActionContext";
import { logger } from "@/lib/logger";
import { createResponse } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type ActionItem = {
  category: string;
  description: string;
  confidence: number;
};

type SignalActionsResponse = {
  actions: ActionItem[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      signalId?: string;
      mode?: string;
    };

    if (!body.slug || !body.signalId) {
      return NextResponse.json(
        { ok: false, error: "slug and signalId are required" },
        { status: 400 },
      );
    }

    if (body.mode !== "generate") {
      return NextResponse.json(
        { ok: false, error: "mode must be 'generate'" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

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

    const context = await getSignalActionContext(supabase, system.id, body.signalId);

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

    const rawOutput =
      (response as any)?.output_text ??
      (response as any)?.output?.[0]?.content?.[0]?.text;

    if (!rawOutput) {
      logger.error("Model response missing", { systemId: system.id, signalId: body.signalId });
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    let parsed: SignalActionsResponse;

    try {
      parsed = JSON.parse(rawOutput) as SignalActionsResponse;
    } catch (error) {
      logger.error(error, "Failed to parse model output", rawOutput);
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    // Validate structure
    if (!Array.isArray(parsed.actions)) {
      logger.error("Invalid actions structure", parsed);
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
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
          signal_id: body.signalId,
          action_category: action.category,
          action_description: action.description,
          confidence: action.confidence,
        })
        .select()
        .single();

      if (error) {
        logger.error(error, "Failed to insert signal action");
        return null;
      }

      return data;
    });

    const insertedRows = (await Promise.all(insertPromises)).filter(
      (row) => row !== null,
    );

    if (insertedRows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      actions: insertedRows,
    });
  } catch (error) {
    logger.error(error, "Signal actions generation error");
    return NextResponse.json(
      { ok: false, error: "generation_failed" },
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

    const { data: items, error: itemsError } = await supabase
      .from("signal_actions")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false });

    if (itemsError) {
      logger.error(itemsError, "Failed to fetch signal actions");
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ signal_actions: items ?? [] });
  } catch (error) {
    logger.error(error, "Signal actions fetch error");
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

