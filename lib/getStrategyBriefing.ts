import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { getSingleSystemHealthScore } from "@/lib/getSingleSystemHealthScore";

export interface StrategyPriority {
  name: string;
  rationale: string;
  supportingSignals: string[];
}

export interface StrategicRisk {
  name: string;
  severity: "low" | "medium" | "high";
  rationale: string;
  evidence: string[];
  mitigation: string;
}

export interface StrategicOpportunity {
  name: string;
  impact: string;
  rationale: string;
  action: string;
}

export interface StrategyBriefing {
  systemId: string;
  systemSlug: string;
  systemName: string;
  horizonMonths: number;
  executiveSummary: string;
  priorities: StrategyPriority[];
  risks: StrategicRisk[];
  opportunities: StrategicOpportunity[];
  recommendations: string[];
}

type StrategyBriefingModelOutput = {
  executiveSummary: string;
  priorities: StrategyPriority[];
  risks: StrategicRisk[];
  opportunities: StrategicOpportunity[];
  recommendations: string[];
};

const StrategyBriefingModelOutputSchema = z.object({
  executiveSummary: z.string(),
  priorities: z.array(
    z.object({
      name: z.string(),
      rationale: z.string(),
      supportingSignals: z.array(z.string()),
    }),
  ),
  risks: z.array(
    z.object({
      name: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      rationale: z.string(),
      evidence: z.array(z.string()),
      mitigation: z.string(),
    }),
  ),
  opportunities: z.array(
    z.object({
      name: z.string(),
      impact: z.string(),
      rationale: z.string(),
      action: z.string(),
    }),
  ),
  recommendations: z.array(z.string()),
});

const DAYS_180_MS = 180 * 24 * 60 * 60 * 1000;

type SignalRow = {
  category: string | null;
  severity: string | null;
  summary: string | null;
  created_at: string | null;
};

type DocumentRow = {
  title: string | null;
  source_type: string | null;
};

type OpportunityRow = {
  stage: string | null;
  status: string | null;
  amount: number | null;
};

export async function getStrategyBriefing(
  supabase: SupabaseClient,
  params: {
    systemSlug: string;
    horizonMonths: number;
  },
): Promise<StrategyBriefing | null> {
  try {
    // 1. Lookup system
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("slug", params.systemSlug)
      .maybeSingle<{
        id: string;
        slug: string;
        name: string;
        website: string | null;
        hq_city: string | null;
        hq_state: string | null;
      }>();

    if (systemError || !system) {
      logger.warn("System not found for strategy briefing", { systemSlug: params.systemSlug, error: systemError });
      return null;
    }

    // 2. Fetch relevant system data
    const sinceIso = new Date(Date.now() - DAYS_180_MS).toISOString();

    const [
      { data: signalRows, error: signalError },
      { data: documentRows, error: documentError },
      { data: opportunityRows, error: opportunityError },
      health,
    ] = await Promise.all([
      supabase
        .from("signals")
        .select("category, severity, summary, created_at")
        .eq("system_id", system.id)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<SignalRow[]>(),
      supabase
        .from("documents")
        .select("title, source_type")
        .eq("system_id", system.id)
        .order("crawled_at", { ascending: false })
        .limit(30)
        .returns<DocumentRow[]>(),
      supabase
        .from("opportunities")
        .select("stage, status, amount")
        .eq("system_id", system.id)
        .returns<OpportunityRow[]>(),
      getSingleSystemHealthScore(supabase, system.id),
    ]);

    if (signalError) {
      logger.error(signalError, "Failed to fetch signals for strategy briefing", { systemId: system.id });
    }
    if (documentError) {
      logger.error(documentError, "Failed to fetch documents for strategy briefing", { systemId: system.id });
    }
    if (opportunityError) {
      logger.error(opportunityError, "Failed to fetch opportunities for strategy briefing", { systemId: system.id });
    }

    // 3. Assemble compact, capped context text
    const locationParts: string[] = [];
    if (system.hq_city) locationParts.push(system.hq_city);
    if (system.hq_state) locationParts.push(system.hq_state);
    const location = locationParts.length > 0 ? locationParts.join(", ") : "Unknown";

    const healthScoreText = health
      ? `HEALTH SCORE: ${health.overallScore} (${health.band})`
      : "HEALTH SCORE: Not available";

    const signalLines =
      (signalRows ?? []).length > 0
        ? (signalRows ?? [])
            .slice(0, 30)
            .map(
              (s) =>
                `- [${s.severity ?? "unknown"}][${s.category ?? "unknown"}] ${s.summary ?? "No summary"}`,
            )
        : ["- None"];

    const opportunityLines =
      (opportunityRows ?? []).length > 0
        ? (opportunityRows ?? []).map(
            (o) =>
              `- ${o.stage ?? "unknown"} / ${o.status ?? "unknown"}${o.amount ? ` ($${o.amount.toLocaleString()})` : ""}`,
          )
        : ["- None"];

    const documentLines =
      (documentRows ?? []).length > 0
        ? (documentRows ?? []).map((d) => `- ${d.title ?? "Untitled"} (${d.source_type ?? "unknown"})`)
        : ["- None"];

    const contextText = [
      `SYSTEM: ${system.name}, ${location}`,
      system.website ? `Website: ${system.website}` : "",
      healthScoreText,
      "",
      "RECENT SIGNALS (last ~180 days):",
      ...signalLines,
      "",
      "PIPELINE:",
      ...opportunityLines,
      "",
      "RECENT DOCUMENTS:",
      ...documentLines,
    ]
      .filter(Boolean)
      .join("\n");

    const cappedContext = capPromptLength(contextText, 40000);

    // 4. LLM call
    const prompt = [
      `You are a strategic healthcare intelligence analyst. Generate an executive strategy briefing for a healthcare system over the next ${params.horizonMonths} months.`,
      "Context:",
      cappedContext,
      "",
      `Generate a JSON object with the following structure for a ${params.horizonMonths}-month strategic horizon:`,
      `{
  "executiveSummary": "string - 2-3 paragraph executive summary",
  "priorities": [
    {
      "name": "string",
      "rationale": "string",
      "supportingSignals": ["string"]
    }
  ],
  "risks": [
    {
      "name": "string",
      "severity": "low" | "medium" | "high",
      "rationale": "string",
      "evidence": ["string"],
      "mitigation": "string"
    }
  ],
  "opportunities": [
    {
      "name": "string",
      "impact": "string",
      "rationale": "string",
      "action": "string"
    }
  ],
  "recommendations": ["string"]
}`,
      "",
      "Return only valid JSON. Do not include any explanatory text.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      logger.error(new Error("No output from OpenAI"), "Strategy briefing generation failed - no output", {
        systemId: system.id,
      });
      return null;
    }

    // 5. Validate JSON
    let parsed: StrategyBriefingModelOutput;
    try {
      parsed = JSON.parse(rawOutput) as StrategyBriefingModelOutput;
    } catch (error) {
      logger.error(error, "Failed to parse strategy briefing JSON", { rawOutput, systemId: system.id });
      return null;
    }

    // Validate with Zod
    const validationResult = StrategyBriefingModelOutputSchema.safeParse(parsed);
    if (!validationResult.success) {
      logger.error(
        validationResult.error,
        "Strategy briefing validation failed",
        { systemId: system.id, parsed },
      );
      return null;
    }

    const validated = validationResult.data;

    // 6. Return validated object with system metadata
    return {
      systemId: system.id,
      systemSlug: system.slug,
      systemName: system.name,
      horizonMonths: params.horizonMonths,
      executiveSummary: validated.executiveSummary,
      priorities: validated.priorities,
      risks: validated.risks,
      opportunities: validated.opportunities,
      recommendations: validated.recommendations,
    };
  } catch (error) {
    logger.error(error, "Error generating strategy briefing", { systemSlug: params.systemSlug });
    return null;
  }
}

