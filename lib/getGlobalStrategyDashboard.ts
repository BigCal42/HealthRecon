import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { getSystemHealthScores } from "@/lib/getSystemHealthScore";

export interface GlobalTheme {
  name: string;
  rationale: string;
  representativeSystems: string[]; // slugs
}

export interface GlobalRisk {
  name: string;
  severity: "low" | "medium" | "high";
  rationale: string;
  affectedSystems: string[]; // slugs
}

export interface GlobalOpportunity {
  name: string;
  impact: string;
  rationale: string;
  targetSystems: string[]; // slugs
}

export interface GlobalRecommendation {
  action: string;
  rationale: string;
}

export interface GlobalStrategyDashboard {
  horizon: "7d" | "30d" | "90d";
  executiveSummary: string;
  topThemes: GlobalTheme[];
  risks: GlobalRisk[];
  opportunities: GlobalOpportunity[];
  recommendations: GlobalRecommendation[];
}

type GlobalStrategyDashboardModelOutput = {
  executiveSummary: string;
  topThemes: GlobalTheme[];
  risks: GlobalRisk[];
  opportunities: GlobalOpportunity[];
  recommendations: GlobalRecommendation[];
};

const GlobalThemeSchema = z.object({
  name: z.string(),
  rationale: z.string(),
  representativeSystems: z.array(z.string()),
});

const GlobalRiskSchema = z.object({
  name: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
  affectedSystems: z.array(z.string()),
});

const GlobalOpportunitySchema = z.object({
  name: z.string(),
  impact: z.string(),
  rationale: z.string(),
  targetSystems: z.array(z.string()),
});

const GlobalRecommendationSchema = z.object({
  action: z.string(),
  rationale: z.string(),
});

const GlobalStrategyDashboardModelOutputSchema = z.object({
  executiveSummary: z.string(),
  topThemes: z.array(GlobalThemeSchema),
  risks: z.array(GlobalRiskSchema),
  opportunities: z.array(GlobalOpportunitySchema),
  recommendations: z.array(GlobalRecommendationSchema),
});

type SystemRow = {
  id: string;
  slug: string;
  name: string;
};

type SignalRow = {
  system_id: string | null;
  category: string | null;
  severity: string | null;
  summary: string | null;
  created_at: string | null;
};

type OpportunityRow = {
  system_id: string | null;
  stage: string | null;
  status: string | null;
  amount: number | null;
  close_date: string | null;
};

function getDaysFromHorizon(horizon: "7d" | "30d" | "90d"): number {
  switch (horizon) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

export async function getGlobalStrategyDashboard(
  supabase: SupabaseClient,
  params: { horizon: "7d" | "30d" | "90d" },
): Promise<GlobalStrategyDashboard | null> {
  try {
    const days = getDaysFromHorizon(params.horizon);
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch all systems
    const { data: systems, error: systemsError } = await supabase
      .from("systems")
      .select("id, slug, name")
      .order("name", { ascending: true })
      .returns<SystemRow[]>();

    if (systemsError || !systems || systems.length === 0) {
      logger.warn("No systems found for global strategy dashboard", { error: systemsError });
      return null;
    }

    const systemIds = systems.map((s) => s.id);
    const systemMap = new Map<string, { slug: string; name: string }>();
    systems.forEach((s) => {
      systemMap.set(s.id, { slug: s.slug, name: s.name });
    });

    // 2. Fetch cross-system data
    const [
      { data: signalRows, error: signalError },
      { data: opportunityRows, error: opportunityError },
      healthScores,
    ] = await Promise.all([
      supabase
        .from("signals")
        .select("system_id, category, severity, summary, created_at")
        .in("system_id", systemIds)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<SignalRow[]>(),
      supabase
        .from("opportunities")
        .select("system_id, stage, status, amount, close_date")
        .in("system_id", systemIds)
        .returns<OpportunityRow[]>(),
      getSystemHealthScores(supabase),
    ]);

    if (signalError) {
      logger.error(signalError, "Failed to fetch signals for global strategy dashboard");
    }
    if (opportunityError) {
      logger.error(opportunityError, "Failed to fetch opportunities for global strategy dashboard");
    }

    // 3. Build compact context
    const systemLines = systems.map((s) => `- ${s.name} (${s.slug})`);

    const signalsBySystem = new Map<string, SignalRow[]>();
    (signalRows ?? []).forEach((signal) => {
      if (signal.system_id) {
        const existing = signalsBySystem.get(signal.system_id) ?? [];
        existing.push(signal);
        signalsBySystem.set(signal.system_id, existing);
      }
    });

    const signalLines: string[] = [];
    signalsBySystem.forEach((signals, systemId) => {
      const system = systemMap.get(systemId);
      if (!system) return;
      signalLines.push(`\n${system.name} (${system.slug}):`);
      signals.slice(0, 10).forEach((s) => {
        signalLines.push(
          `  - [${s.severity ?? "unknown"}][${s.category ?? "unknown"}] ${s.summary ?? "No summary"}`,
        );
      });
    });

    const opportunitiesBySystem = new Map<string, OpportunityRow[]>();
    (opportunityRows ?? []).forEach((opp) => {
      if (opp.system_id) {
        const existing = opportunitiesBySystem.get(opp.system_id) ?? [];
        existing.push(opp);
        opportunitiesBySystem.set(opp.system_id, existing);
      }
    });

    const opportunityLines: string[] = [];
    opportunitiesBySystem.forEach((opps, systemId) => {
      const system = systemMap.get(systemId);
      if (!system) return;
      const openOpps = opps.filter((o) => o.status === "open" || o.status === "in_progress");
      const totalAmount = openOpps.reduce((sum, o) => sum + (o.amount ?? 0), 0);
      opportunityLines.push(
        `- ${system.name} (${system.slug}): ${openOpps.length} open/in-progress${totalAmount > 0 ? `, $${totalAmount.toLocaleString()} total` : ""}`,
      );
    });

    const healthScoreLines: string[] = [];
    healthScores.forEach((health) => {
      healthScoreLines.push(`- ${health.name} (${health.slug}): ${health.overallScore} (${health.band})`);
    });

    const contextText = [
      `PORTFOLIO OVERVIEW (${params.horizon} window):`,
      "",
      "SYSTEMS:",
      ...systemLines,
      "",
      `SIGNALS (last ${days} days):`,
      signalLines.length > 0 ? signalLines.join("\n") : "- None",
      "",
      "OPPORTUNITIES (open pipeline per system):",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
      "",
      "HEALTH SCORES:",
      healthScoreLines.length > 0 ? healthScoreLines.join("\n") : "- None",
    ]
      .filter(Boolean)
      .join("\n");

    const cappedContext = capPromptLength(contextText, 40000);

    // 4. LLM call
    const prompt = [
      `You are a portfolio-level strategic intelligence analyst. Generate a global strategy dashboard synthesizing intelligence across all healthcare systems in the portfolio over a ${params.horizon} horizon.`,
      "Context:",
      cappedContext,
      "",
      `Generate a JSON object with the following structure for a ${params.horizon} strategic horizon:`,
      `{
  "executiveSummary": "string - 2-3 paragraph executive summary of portfolio-wide strategic posture",
  "topThemes": [
    {
      "name": "string",
      "rationale": "string",
      "representativeSystems": ["slug1", "slug2"]
    }
  ],
  "risks": [
    {
      "name": "string",
      "severity": "low" | "medium" | "high",
      "rationale": "string",
      "affectedSystems": ["slug1", "slug2"]
    }
  ],
  "opportunities": [
    {
      "name": "string",
      "impact": "string",
      "rationale": "string",
      "targetSystems": ["slug1", "slug2"]
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "rationale": "string"
    }
  ]
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
      logger.error(new Error("No output from OpenAI"), "Global strategy dashboard generation failed - no output");
      return null;
    }

    // 5. Validate JSON
    let parsed: GlobalStrategyDashboardModelOutput;
    try {
      parsed = JSON.parse(rawOutput) as GlobalStrategyDashboardModelOutput;
    } catch (error) {
      logger.error(error, "Failed to parse global strategy dashboard JSON", { rawOutput });
      return null;
    }

    // Validate with Zod
    const validationResult = GlobalStrategyDashboardModelOutputSchema.safeParse(parsed);
    if (!validationResult.success) {
      logger.error(validationResult.error, "Global strategy dashboard validation failed", { parsed });
      return null;
    }

    const validated = validationResult.data;

    // 6. Return validated object with horizon
    return {
      horizon: params.horizon,
      executiveSummary: validated.executiveSummary,
      topThemes: validated.topThemes,
      risks: validated.risks,
      opportunities: validated.opportunities,
      recommendations: validated.recommendations,
    };
  } catch (error) {
    logger.error(error, "Error generating global strategy dashboard");
    return null;
  }
}

