import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { getSuggestionInputs } from "@/lib/getSuggestionInputs";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type SuggestionModelOutput = {
  opportunities?: {
    title?: string;
    description?: string;
    source_kind?: "signal" | "news";
  }[];
};

const MAX_ARTICLE_CHARS = 1000;

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/opportunity-suggestions");
  ctx.logInfo("Opportunity suggestions generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `opportunity-suggestions:${ip}`,
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
    });

    const body = await parseJsonBody(request, postSchema);
    const slug = body.slug;

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle<{ id: string; name: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
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
      ctx.logError(new Error("Opportunity suggestion model returned no output"), "Model response missing", { systemId: system.id });
      return apiError(502, "generation_failed", "Model response missing");
    }

    let parsed: SuggestionModelOutput;

    try {
      parsed = JSON.parse(rawOutput) as SuggestionModelOutput;
    } catch (error) {
      ctx.logError(error, "Failed to parse suggestion output", { rawOutput, systemId: system.id });
      return apiError(502, "generation_failed", "Failed to parse model output");
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
        ctx.logError(insertError, "Failed to insert suggestion", { systemId: system.id, title: opp.title });
        continue;
      }

      created += 1;
    }

    ctx.logInfo("Opportunity suggestions generated successfully", { systemId: system.id, created });
    return apiSuccess({ created });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunity suggestions POST error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/opportunity-suggestions");
  ctx.logInfo("Opportunity suggestions fetch request received");

  try {
    const getSchema = z.object({
      slug: z.string().min(1).max(100),
    });

    const validated = validateQuery(request.url, getSchema);
    const slug = validated.slug;

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: suggestions, error: suggestionsError } = await supabase
      .from("opportunity_suggestions")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (suggestionsError) {
      ctx.logError(suggestionsError, "Failed to fetch opportunity suggestions", { systemId: system.id });
      return apiError(500, "fetch_failed", "Failed to fetch opportunity suggestions");
    }

    ctx.logInfo("Opportunity suggestions fetched successfully", { systemId: system.id, count: suggestions?.length ?? 0 });
    return apiSuccess({ suggestions: suggestions ?? [] });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Opportunity suggestions GET error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

