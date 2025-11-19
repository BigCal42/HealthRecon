import { NextResponse } from "next/server";

import { getSuggestionInputs } from "@/lib/getSuggestionInputs";
import { logger } from "@/lib/logger";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { rateLimit } from "@/lib/rateLimit";
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

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      logger.error(new Error("Opportunity suggestion model returned no output"));
      return NextResponse.json({ error: "model_failure" }, { status: 502 });
    }

    let parsed: SuggestionModelOutput;

    try {
      parsed = JSON.parse(rawOutput) as SuggestionModelOutput;
    } catch (error) {
      logger.error(error, "Failed to parse suggestion output", rawOutput);
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
        logger.error(insertError, "Failed to insert suggestion");
        continue;
      }

      created += 1;
    }

    return NextResponse.json({ created });
  } catch (error) {
    logger.error(error, "Opportunity suggestions POST error");
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
      logger.error(suggestionsError, "Failed to fetch opportunity suggestions");
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ suggestions: suggestions ?? [] });
  } catch (error) {
    logger.error(error, "Opportunity suggestions GET error");
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}

