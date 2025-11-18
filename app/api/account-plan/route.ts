import { NextResponse } from "next/server";

import { getAccountPlanContext } from "@/lib/getAccountPlanContext";
import { logger } from "@/lib/logger";
import { createResponse } from "@/lib/openaiClient";
import { rateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type AccountPlanPayload = {
  account_overview: string;
  business_objectives: string[];
  current_state: string[];
  key_stakeholders: string[];
  opportunity_themes: string[];
  risks_and_blocks: string[];
  strategy_and_plays: string[];
  near_term_actions: string[];
};

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

    const { data: plan, error: planError } = await supabase
      .from("account_plans")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        system_id: string;
        summary: AccountPlanPayload;
        created_at: string;
      }>();

    if (planError) {
      logger.error(planError, "Failed to fetch account plan");
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ plan: plan ?? null });
  } catch (error) {
    logger.error(error, "Account plan fetch error");
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

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
      mode?: "generate" | "save";
      plan?: AccountPlanPayload;
    };

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

    if (body.mode === "save") {
      if (!body.plan) {
        return NextResponse.json(
          { ok: false, error: "plan_required" },
          { status: 400 },
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from("account_plans")
        .insert({
          system_id: system.id,
          summary: body.plan,
        })
        .select("*")
        .single();

      if (insertError || !inserted) {
        logger.error(insertError, "Failed to save account plan");
        return NextResponse.json(
          { ok: false, error: "save_failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, plan: inserted });
    }

    // Mode: "generate"
    const context = await getAccountPlanContext(supabase, system.id);

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

    // Key contacts: primary & execs
    const primaryContacts = context.contacts.filter((c) => c.is_primary);
    const execContacts = context.contacts.filter(
      (c) => c.seniority === "exec" || c.seniority === "executive",
    );
    const keyContacts = [...primaryContacts, ...execContacts];
    const contactLines = keyContacts.map(
      (c) =>
        `- ${c.full_name}${c.title ? ` (${c.title})` : ""}${c.department ? ` - ${c.department}` : ""}${c.role_in_deal ? ` [${c.role_in_deal}]` : ""}${c.seniority ? ` (${c.seniority})` : ""}`,
    );

    // Opportunities: highlight open/in_progress
    const openOpps = context.opportunities.filter((o) =>
      ["open", "in_progress"].includes(o.status),
    );
    const opportunityLines = context.opportunities.map(
      (opp) =>
        `- [${opp.status}] ${opp.title ?? "Untitled"}: ${opp.description ?? "No description"}`,
    );

    // Recent interactions (last 20)
    const interactionLines = context.interactions.map(
      (interaction) =>
        `- [${interaction.channel}] ${interaction.subject ?? "No subject"} (${interaction.occurred_at}): ${interaction.summary ?? "No summary"}${interaction.next_step ? ` | Next: ${interaction.next_step}${interaction.next_step_due_at ? ` (due: ${interaction.next_step_due_at})` : ""}` : ""}`,
    );

    // Profile context
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

    // Outbound playbook context
    let playbookContext = "";
    if (context.playbook?.summary) {
      try {
        const playbookSummary = context.playbook.summary as {
          outbound_brief?: string;
        };
        playbookContext = playbookSummary.outbound_brief ?? "";
      } catch {
        // Ignore parsing errors
      }
    }

    const prompt = [
      "You are a healthcare IT account strategist. Based on this context, produce a concise, structured account plan for this health system. Output valid JSON only.",
      systemInfo,
      "Key Contacts:",
      contactLines.length > 0 ? contactLines.join("\n") : "- None",
      "All Opportunities:",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      "Recent Interactions (last 20):",
      interactionLines.length > 0 ? interactionLines.join("\n") : "- None",
      profileContext ? `System Profile:\n${profileContext}` : "",
      playbookContext ? `Outbound Playbook Brief:\n${playbookContext}` : "",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        account_overview: "string (1-2 paragraphs)",
        business_objectives: ["string (3-7 bullets)"],
        current_state: ["string (3-7 bullets - what's true today)"],
        key_stakeholders: ["string (bullet descriptions: name + role + angle)"],
        opportunity_themes: ["string (major threads we could sell into)"],
        risks_and_blocks: ["string (risks, blockers)"],
        strategy_and_plays: ["string (what we should do over next 3-6 months)"],
        near_term_actions: ["string (specific actions next 2-4 weeks)"],
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
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    let parsed: AccountPlanPayload;

    try {
      parsed = JSON.parse(rawOutput) as AccountPlanPayload;
    } catch (error) {
      logger.error(error, "Failed to parse model output", rawOutput);
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    // Validate structure
    if (
      typeof parsed.account_overview !== "string" ||
      !Array.isArray(parsed.business_objectives) ||
      !Array.isArray(parsed.current_state) ||
      !Array.isArray(parsed.key_stakeholders) ||
      !Array.isArray(parsed.opportunity_themes) ||
      !Array.isArray(parsed.risks_and_blocks) ||
      !Array.isArray(parsed.strategy_and_plays) ||
      !Array.isArray(parsed.near_term_actions)
    ) {
      logger.error("Invalid account plan structure", parsed);
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 502 },
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("account_plans")
      .insert({
        system_id: system.id,
        summary: parsed,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      logger.error(insertError, "Failed to store account plan");
      return NextResponse.json(
        { ok: false, error: "generation_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, plan: inserted });
  } catch (error) {
    logger.error(error, "Account plan generation error");
    return NextResponse.json(
      { ok: false, error: "generation_failed" },
      { status: 500 },
    );
  }
}

