import { NextResponse } from "next/server";

import { getMeetingPrepContext } from "@/lib/getMeetingPrepContext";
import { logger } from "@/lib/logger";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type MeetingPrepPayload = {
  meeting_title: string;
  objectives: string[];
  attendee_overview: string[];
  system_context: string[];
  talk_tracks: string[];
  discovery_questions: string[];
  landmines_and_risks: string[];
  proposed_next_steps: string[];
  personal_notes_suggestions: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      contactName?: string | null;
      meetingGoal?: string | null;
    };

    if (!body.slug) {
      return NextResponse.json(
        { ok: false, error: "slug_required" },
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

    const context = await getMeetingPrepContext(supabase, system.id, {
      contactName: body.contactName ?? null,
    });

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

    // Primary contact info (if found)
    let contactInfo = "";
    if (context.primaryContact) {
      contactInfo = [
        `Primary Contact: ${context.primaryContact.full_name}`,
        context.primaryContact.title ? `Title: ${context.primaryContact.title}` : "",
        context.primaryContact.department
          ? `Department: ${context.primaryContact.department}`
          : "",
        context.primaryContact.seniority
          ? `Seniority: ${context.primaryContact.seniority}`
          : "",
        context.primaryContact.role_in_deal
          ? `Role in Deal: ${context.primaryContact.role_in_deal}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    // All contacts summary
    const contactLines = context.contacts.map(
      (c) =>
        `- ${c.full_name}${c.title ? ` (${c.title})` : ""}${c.department ? ` - ${c.department}` : ""}${c.role_in_deal ? ` [${c.role_in_deal}]` : ""}${c.seniority ? ` (${c.seniority})` : ""}${c.is_primary ? " [PRIMARY]" : ""}`,
    );

    // Open/in-progress opportunities
    const openOpps = context.opportunities.filter((o) =>
      ["open", "in_progress"].includes(o.status),
    );
    const opportunityLines = openOpps.map(
      (opp) =>
        `- [${opp.status}] ${opp.title}: ${opp.description ?? "No description"}`,
    );

    // Recent interactions (last 10-20)
    const recentInteractions = context.interactions.slice(0, 15);
    const interactionLines = recentInteractions.map(
      (interaction) =>
        `- [${interaction.channel}] ${interaction.subject ?? "No subject"} (${new Date(interaction.occurred_at).toLocaleDateString()}): ${interaction.summary ?? "No summary"}${interaction.next_step ? ` | Next: ${interaction.next_step}${interaction.next_step_due_at ? ` (due: ${new Date(interaction.next_step_due_at).toLocaleDateString()})` : ""}` : ""}`,
    );

    // Recent signals (last 60 days)
    const signalLines = context.signals.map(
      (signal) =>
        `- [${signal.category ?? "unknown"}] (${signal.severity ?? "unknown"}) ${signal.summary ?? ""}`,
    );

    // Recent news (last 60 days, truncated)
    const newsLines = context.news.slice(0, 10).map((article) => {
      const truncatedText =
        (article.raw_text ?? "").length > 500
          ? (article.raw_text ?? "").substring(0, 500) + "..."
          : article.raw_text ?? "";
      return `- ${article.title ?? "Untitled"}: ${truncatedText}`;
    });

    // Account plan context
    let accountPlanContext = "";
    if (context.accountPlan?.summary) {
      try {
        const planSummary = context.accountPlan.summary as {
          account_overview?: string;
          business_objectives?: string[];
          opportunity_themes?: string[];
          strategy_and_plays?: string[];
          near_term_actions?: string[];
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
          planSummary.near_term_actions && Array.isArray(planSummary.near_term_actions)
            ? `Near-term Actions: ${planSummary.near_term_actions.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch {
        // Ignore parsing errors
      }
    }

    // Outbound playbook context
    let playbookContext = "";
    if (context.outboundPlaybook?.summary) {
      try {
        const playbookSummary = context.outboundPlaybook.summary as {
          outbound_brief?: string;
          call_talk_tracks?: string[];
          email_openers?: string[];
          next_actions?: string[];
        };
        playbookContext = [
          playbookSummary.outbound_brief
            ? `Outbound Brief: ${playbookSummary.outbound_brief}`
            : "",
          playbookSummary.call_talk_tracks && Array.isArray(playbookSummary.call_talk_tracks)
            ? `Call Talk Tracks: ${playbookSummary.call_talk_tracks.join(" | ")}`
            : "",
          playbookSummary.email_openers && Array.isArray(playbookSummary.email_openers)
            ? `Email Openers: ${playbookSummary.email_openers.join(" | ")}`
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

    // Seller context (meeting goal)
    const sellerContext = body.meetingGoal
      ? `\n\nSeller Context / Meeting Goal: ${body.meetingGoal}`
      : "";

    const prompt = [
      "You are a healthcare IT sales strategist preparing for a meeting with a key stakeholder at a health system. Based on the context, generate a concise meeting preparation pack. Output valid JSON only.",
      systemInfo,
      contactInfo ? `\n${contactInfo}` : "",
      "All Contacts:",
      contactLines.length > 0 ? contactLines.join("\n") : "- None",
      "Open/In-Progress Opportunities:",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      "Recent Interactions:",
      interactionLines.length > 0 ? interactionLines.join("\n") : "- None",
      "Recent Signals (last 60 days):",
      signalLines.length > 0 ? signalLines.join("\n") : "- None",
      "Recent News (last 60 days):",
      newsLines.length > 0 ? newsLines.join("\n\n") : "- None",
      accountPlanContext ? `\nAccount Plan:\n${accountPlanContext}` : "",
      playbookContext ? `\nOutbound Playbook:\n${playbookContext}` : "",
      sellerContext,
      "\nGenerate a JSON object with the following structure:",
      JSON.stringify({
        meeting_title: "string (e.g. 'Intro / Discovery with CNIO at [System Name]')",
        objectives: ["string (3-7 bullets)"],
        attendee_overview: ["string (bullets about key contact(s))"],
        system_context: ["string (key situational points)"],
        talk_tracks: ["string (themes to emphasize)"],
        discovery_questions: ["string (questions to ask)"],
        landmines_and_risks: ["string (what to avoid or be careful about)"],
        proposed_next_steps: ["string (how to close and follow up)"],
        personal_notes_suggestions: ["string (prompts for seller's own notes)"],
      }),
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
        { ok: false, error: "meeting_prep_generation_failed" },
        { status: 502 },
      );
    }

    let parsed: MeetingPrepPayload;

    try {
      parsed = JSON.parse(rawOutput) as MeetingPrepPayload;
    } catch (error) {
      logger.error(error, "Failed to parse model output", rawOutput);
      return NextResponse.json(
        { ok: false, error: "meeting_prep_generation_failed" },
        { status: 502 },
      );
    }

    // Validate structure
    if (
      typeof parsed.meeting_title !== "string" ||
      !Array.isArray(parsed.objectives) ||
      !Array.isArray(parsed.attendee_overview) ||
      !Array.isArray(parsed.system_context) ||
      !Array.isArray(parsed.talk_tracks) ||
      !Array.isArray(parsed.discovery_questions) ||
      !Array.isArray(parsed.landmines_and_risks) ||
      !Array.isArray(parsed.proposed_next_steps) ||
      !Array.isArray(parsed.personal_notes_suggestions)
    ) {
      logger.error("Invalid meeting prep structure", parsed);
      return NextResponse.json(
        { ok: false, error: "meeting_prep_generation_failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      prep: parsed,
    });
  } catch (error) {
    logger.error(error, "Meeting prep generation error");
    return NextResponse.json(
      { ok: false, error: "meeting_prep_generation_failed" },
      { status: 500 },
    );
  }
}

