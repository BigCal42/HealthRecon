import { NextResponse } from "next/server";

import { getSuggestionInputs } from "@/lib/getSuggestionInputs";
import { createResponse } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type SuggestionModelOutput = {
  opportunities?: {
    title?: string;
    description?: string;
    source_kind?: "signal" | "news";
  }[];
};

const MAX_ARTICLE_CHARS = 1000;

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const body = (await request.json().catch(() => null)) as { slug?: string } | null;

    const slug = body?.slug;

    if (!slug) {
      return NextResponse.json({ error: "slug_required" }, { status: 400 });
    }

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle<{ id: string; name: string }>();

    if (systemError || !system) {
      return NextResponse.json({ error: "system_not_found" }, { status: 404 });
    }

    const { signals, news } = await getSuggestionInputs(supabase, system.id);

    const context = {
      signals: signals.map((signal) => ({
        id: signal.id,
        category: signal.category,
        severity: signal.severity,
        summary: signal.summary,
      })),
      news: news.map((article) => ({
        id: article.id,
        title: article.title,
        text: (article.raw_text ?? "").slice(0, MAX_ARTICLE_CHARS),
      })),
    };

    const prompt = [
      "You are a healthcare IT sales strategist. Given signals and news about one health system, propose 3–5 concrete, actionable sales opportunities for consulting / IT services. Each opportunity must have: title, description, and source_kind: 'signal' | 'news'.",
      `System Name: ${system.name}`,
      "Context JSON:",
      JSON.stringify(context),
    ].join("\n\n");

    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput =
      (response as any)?.output_text ??
      (response as any)?.output?.[0]?.content?.[0]?.text;

    if (!rawOutput) {
      console.error("Opportunity suggestion model returned no output");
      return NextResponse.json({ error: "model_failure" }, { status: 502 });
    }

    let parsed: SuggestionModelOutput;

    try {
      parsed = JSON.parse(rawOutput) as SuggestionModelOutput;
    } catch (error) {
      console.error("Failed to parse suggestion output", error, rawOutput);
      return NextResponse.json({ error: "model_failure" }, { status: 502 });
    }

    const opportunities = Array.isArray(parsed.opportunities)
      ? parsed.opportunities
      : [];

    let created = 0;

    for (const opp of opportunities) {
      if (!opp?.title || !opp?.description || !opp?.source_kind) {
        continue;
      }

      const { error: insertError } = await supabase
        .from("opportunity_suggestions")
        .insert({
          system_id: system.id,
          title: opp.title,
          description: opp.description,
          source_kind: opp.source_kind,
        });

      if (insertError) {
        console.error("Failed to insert suggestion", insertError);
        continue;
      }

      created += 1;
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Opportunity suggestions POST error", error);
    return NextResponse.json({ error: "model_failure" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "slug_required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return NextResponse.json({ error: "system_not_found" }, { status: 404 });
    }

    const { data: suggestions, error: suggestionsError } = await supabase
      .from("opportunity_suggestions")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (suggestionsError) {
      console.error("Failed to fetch opportunity suggestions", suggestionsError);
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ suggestions: suggestions ?? [] });
  } catch (error) {
    console.error("Opportunity suggestions GET error", error);
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}

