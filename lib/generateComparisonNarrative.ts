import type { OpenAI } from "openai";

import type { SystemComparison } from "./compareSystems";
import { createResponse, extractTextFromResponse } from "./openaiClient";

type NarrativeResponse = {
  summary: string[];
  signals_narrative: string;
  technology_narrative: string;
  opportunities_narrative: string;
  interactions_narrative: string;
  contacts_narrative: string;
  health_narrative: string;
  final_insights: string[];
  executive_brief: string;
};

export async function generateComparisonNarrative(
  openai: OpenAI,
  comparison: SystemComparison,
): Promise<SystemComparison> {
  const { systemA, systemB, categoryComparisons, healthComparison } = comparison;

  // Build compact JSON input for the model
  const metricsData = {
    systemA: systemA.name,
    systemB: systemB.name,
    signals: {
      a: {
        high: categoryComparisons.signals.a.high,
        medium: categoryComparisons.signals.a.medium,
        low: categoryComparisons.signals.a.low,
        last30: categoryComparisons.signals.a.last30,
      },
      b: {
        high: categoryComparisons.signals.b.high,
        medium: categoryComparisons.signals.b.medium,
        low: categoryComparisons.signals.b.low,
        last30: categoryComparisons.signals.b.last30,
      },
    },
    technology: {
      aCount: categoryComparisons.technology.a.length,
      bCount: categoryComparisons.technology.b.length,
      overlap: categoryComparisons.technology.overlap,
      uniqueA: categoryComparisons.technology.uniqueA,
      uniqueB: categoryComparisons.technology.uniqueB,
    },
    opportunities: {
      aOpen: categoryComparisons.opportunities.aOpen,
      bOpen: categoryComparisons.opportunities.bOpen,
      aProgress: categoryComparisons.opportunities.aProgress,
      bProgress: categoryComparisons.opportunities.bProgress,
    },
    interactions: {
      last14A: categoryComparisons.interactions.last14A,
      last14B: categoryComparisons.interactions.last14B,
      last60A: categoryComparisons.interactions.last60A,
      last60B: categoryComparisons.interactions.last60B,
    },
    contacts: {
      aExecs: categoryComparisons.contacts.aExecs,
      bExecs: categoryComparisons.contacts.bExecs,
      aChampions: categoryComparisons.contacts.aChampions,
      bChampions: categoryComparisons.contacts.bChampions,
    },
    health: {
      scoreA: healthComparison.scoreA,
      bandA: healthComparison.bandA,
      scoreB: healthComparison.scoreB,
      bandB: healthComparison.bandB,
    },
  };

  const prompt = [
    "You are a healthcare IT sales strategist. You compare two health systems based on structured metrics. Produce short, sharp comparative narratives for each category, plus a concise executive brief that explains the key differences and implications. Avoid fluff. Output valid JSON only.",
    "",
    "Comparison Metrics:",
    JSON.stringify(metricsData, null, 2),
    "",
    "Generate a JSON object with the following structure:",
    JSON.stringify({
      summary: ["string - 3-7 high-level bullets comparing the systems"],
      signals_narrative: "string - concise narrative comparing signal activity",
      technology_narrative: "string - concise narrative comparing technology stacks",
      opportunities_narrative: "string - concise narrative comparing opportunities",
      interactions_narrative: "string - concise narrative comparing engagement/interactions",
      contacts_narrative: "string - concise narrative comparing contact networks",
      health_narrative: "string - concise narrative comparing account health",
      final_insights: ["string - 3-7 strategic insights and recommendations"],
      executive_brief: "string - 1-3 short paragraphs summarizing key differences and implications",
    }),
  ].join("\n");

  try {
    const response = await createResponse({
      prompt,
      format: "json_object",
      model: "gpt-4.1-mini",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      throw new Error("Model returned no output");
    }

    let parsed: NarrativeResponse;

    try {
      parsed = JSON.parse(rawOutput) as NarrativeResponse;
    } catch (error) {
      throw new Error(`Failed to parse model output: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Validate structure
    if (
      !Array.isArray(parsed.summary) ||
      typeof parsed.signals_narrative !== "string" ||
      typeof parsed.technology_narrative !== "string" ||
      typeof parsed.opportunities_narrative !== "string" ||
      typeof parsed.interactions_narrative !== "string" ||
      typeof parsed.contacts_narrative !== "string" ||
      typeof parsed.health_narrative !== "string" ||
      !Array.isArray(parsed.final_insights) ||
      typeof parsed.executive_brief !== "string"
    ) {
      throw new Error("Model output missing required fields");
    }

    // Merge into comparison object
    const enriched: SystemComparison = {
      ...comparison,
      summary: parsed.summary,
      categoryComparisons: {
        ...comparison.categoryComparisons,
        signals: {
          ...comparison.categoryComparisons.signals,
          narrative: parsed.signals_narrative,
        },
        technology: {
          ...comparison.categoryComparisons.technology,
          narrative: parsed.technology_narrative,
        },
        opportunities: {
          ...comparison.categoryComparisons.opportunities,
          narrative: parsed.opportunities_narrative,
        },
        interactions: {
          ...comparison.categoryComparisons.interactions,
          narrative: parsed.interactions_narrative,
        },
        contacts: {
          ...comparison.categoryComparisons.contacts,
          narrative: parsed.contacts_narrative,
        },
      },
      healthComparison: {
        ...comparison.healthComparison,
        narrative: parsed.health_narrative,
      },
      finalInsights: parsed.final_insights,
      executiveBrief: parsed.executive_brief,
    };

    return enriched;
  } catch (error) {
    // Re-throw to let API route handle logging
    throw error;
  }
}

