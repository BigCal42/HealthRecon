import { NextResponse } from "next/server";

import { getSystemProfileContext } from "@/lib/getSystemProfileContext";
import { createResponse } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type SystemProfilePayload = {
  executive_summary: string;
  key_leadership: string[];
  strategic_priorities: string[];
  technology_landscape: string[];
  recent_signals: string[];
  opportunities_summary: string[];
  risk_factors: string[];
};

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const body = (await request.json()) as { slug?: string };

    if (!body.slug) {
      return NextResponse.json(
        { ok: false, error: "slug_required" },
        { status: 400 },
      );
    }

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name, website")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string; slug: string; name: string; website: string | null }>();

    if (systemError || !system) {
      return NextResponse.json(
        { ok: false, error: "system_not_found" },
        { status: 404 },
      );
    }

    const context = await getSystemProfileContext(supabase, system.id);

    // Build compact context for the model
    const signalSummaries = context.signals.map(
      (signal) =>
        `[${signal.category ?? "unknown"}] (${signal.severity ?? "unknown"}) ${signal.summary ?? ""}`,
    );

    const entitySummaries = context.entities.map(
      (entity) => `${entity.name} (${entity.type}${entity.role ? ` - ${entity.role}` : ""})`,
    );

    const newsSummaries = context.news.map((article) => {
      const truncatedText =
        (article.raw_text ?? "").length > 500
          ? (article.raw_text ?? "").substring(0, 500) + "..."
          : article.raw_text ?? "";
      return `${article.title ?? "Untitled"}: ${truncatedText}`;
    });

    const opportunitySummaries = context.opportunities.map(
      (opp) => `${opp.title} (${opp.status})`,
    );

    let briefingNarrative = "";
    if (context.briefing?.summary) {
      try {
        const parsedBriefing = JSON.parse(context.briefing.summary) as {
          narrative?: string;
        };
        briefingNarrative = parsedBriefing.narrative ?? "";
      } catch {
        // Ignore parsing errors
      }
    }

    const prompt = [
      "You generate a structured knowledge profile of a healthcare system. Output valid JSON only.",
      `System Name: ${system.name}`,
      system.website ? `Website: ${system.website}` : "",
      "Signals:",
      signalSummaries.length > 0 ? signalSummaries.join("\n") : "- None",
      "Entities:",
      entitySummaries.length > 0 ? entitySummaries.join("\n") : "- None",
      "Recent News:",
      newsSummaries.length > 0 ? newsSummaries.join("\n\n") : "- None",
      "Open Opportunities:",
      opportunitySummaries.length > 0 ? opportunitySummaries.join("\n") : "- None",
      "Latest Briefing Narrative:",
      briefingNarrative || "- None",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        executive_summary: "string",
        key_leadership: ["string"],
        strategic_priorities: ["string"],
        technology_landscape: ["string"],
        recent_signals: ["string"],
        opportunities_summary: ["string"],
        risk_factors: ["string"],
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
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 502 },
      );
    }

    let parsed: SystemProfilePayload;

    try {
      parsed = JSON.parse(rawOutput) as SystemProfilePayload;
    } catch (error) {
      console.error("Failed to parse model output", error, rawOutput);
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 502 },
      );
    }

    // Validate structure
    if (
      typeof parsed.executive_summary !== "string" ||
      !Array.isArray(parsed.key_leadership) ||
      !Array.isArray(parsed.strategic_priorities) ||
      !Array.isArray(parsed.technology_landscape) ||
      !Array.isArray(parsed.recent_signals) ||
      !Array.isArray(parsed.opportunities_summary) ||
      !Array.isArray(parsed.risk_factors)
    ) {
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 502 },
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("system_profiles")
      .insert({
        system_id: system.id,
        summary: parsed,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (insertError || !inserted) {
      console.error("Failed to store system profile", insertError);
      return NextResponse.json(
        { ok: false, error: "model_failure" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      profileId: inserted.id,
    });
  } catch (error) {
    console.error("System profile generation error:", error);
    return NextResponse.json(
      { ok: false, error: "model_failure" },
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

    const { data: profile, error: profileError } = await supabase
      .from("system_profiles")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        system_id: string;
        summary: SystemProfilePayload;
        created_at: string;
      }>();

    if (profileError) {
      console.error("Failed to fetch system profile", profileError);
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ profile: profile ?? null });
  } catch (error) {
    console.error("System profile fetch error:", error);
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

