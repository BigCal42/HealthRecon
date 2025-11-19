import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";

export type OutboundPersona =
  | "cio"
  | "cfo"
  | "cmo"
  | "cnio"
  | "cmio"
  | "operations_leader"
  | "it_director";

export interface OutboundPlaybookTalkingPoint {
  title: string;
  rationale: string;
  evidence: string[]; // short references to signals/docs, not URLs
}

export interface OutboundPlaybookSnippet {
  channel: "email" | "call" | "linkedin";
  persona: OutboundPersona;
  subject?: string | null; // for email/LinkedIn
  opener: string;
  coreMessage: string;
  callToAction: string;
}

export interface OutboundPlaybook {
  systemId: string;
  systemSlug: string;
  systemName: string;
  persona: OutboundPersona;
  summary: string;
  keyThemes: string[];
  recommendedTargets: string[]; // e.g. roles/titles
  talkingPoints: OutboundPlaybookTalkingPoint[];
  snippets: OutboundPlaybookSnippet[];
}

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

type SignalRow = {
  id: string;
  category: string | null;
  severity: string | null;
  summary: string | null;
  created_at: string | null;
};

type DocumentRow = {
  id: string;
  title: string | null;
  source_url: string | null;
  created_at: string | null;
  source_type: string | null;
};

type OpportunityRow = {
  id: string;
  title: string | null;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  close_date: string | null;
};

type ModelOutput = {
  summary: string;
  keyThemes: string[];
  recommendedTargets: string[];
  talkingPoints: Array<{
    title: string;
    rationale: string;
    evidence: string[];
  }>;
  snippets: Array<{
    channel: "email" | "call" | "linkedin";
    persona: OutboundPersona;
    subject?: string | null;
    opener: string;
    coreMessage: string;
    callToAction: string;
  }>;
};

export async function getOutboundPlaybook(
  supabase: SupabaseClient,
  params: {
    systemSlug: string;
    persona: OutboundPersona;
  },
): Promise<OutboundPlaybook | null> {
  try {
    // 1. Resolve system
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("slug", params.systemSlug)
      .maybeSingle<SystemRow>();

    if (systemError || !system) {
      logger.warn("System not found for outbound playbook", { systemSlug: params.systemSlug, error: systemError });
      return null;
    }

    // 2. Gather context (last 90 days for signals, recent documents, open opportunities)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      { data: signals, error: signalsError },
      { data: documents, error: documentsError },
      { data: opportunities, error: opportunitiesError },
    ] = await Promise.all([
      supabase
        .from("signals")
        .select("id, category, severity, summary, created_at")
        .eq("system_id", system.id)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<SignalRow[]>(),
      supabase
        .from("documents")
        .select("id, title, source_url, created_at, source_type")
        .eq("system_id", system.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<DocumentRow[]>(),
      supabase
        .from("opportunities")
        .select("id, title, stage, amount, currency, status, close_date")
        .eq("system_id", system.id)
        .returns<OpportunityRow[]>(),
    ]);

    if (signalsError) {
      logger.error(signalsError, "Failed to fetch signals for outbound playbook", { systemId: system.id });
    }
    if (documentsError) {
      logger.error(documentsError, "Failed to fetch documents for outbound playbook", { systemId: system.id });
    }
    if (opportunitiesError) {
      logger.error(opportunitiesError, "Failed to fetch opportunities for outbound playbook", { systemId: system.id });
    }

    // 3. Build compact context text
    const systemInfo = [
      `Name: ${system.name}`,
      system.hq_city && system.hq_state ? `Location: ${system.hq_city}, ${system.hq_state}` : "",
      system.website ? `Website: ${system.website}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const signalLines = (signals ?? []).map((signal) => {
      const date = signal.created_at ? new Date(signal.created_at).toLocaleDateString() : "";
      return `- [${signal.severity ?? "unknown"}/${signal.category ?? "unknown"}] ${signal.summary ?? ""} ${date}`;
    });

    const documentLines = (documents ?? []).map((doc) => {
      const date = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "";
      return `- [${doc.source_type ?? "document"}] ${doc.title ?? "Untitled"} ${date}`;
    });

    const opportunityLines = (opportunities ?? []).map((opp) => {
      const amountStr = opp.amount && opp.currency ? `${opp.currency} ${opp.amount}` : "";
      const dateStr = opp.close_date ? ` (close: ${new Date(opp.close_date).toLocaleDateString()})` : "";
      return `- ${opp.title ?? "Untitled"} | ${opp.stage ?? "unknown"} | ${opp.status ?? "unknown"}${amountStr ? ` | ${amountStr}` : ""}${dateStr}`;
    });

    const contextText = [
      "SYSTEM:",
      systemInfo,
      "",
      "SIGNALS (recent):",
      signalLines.length > 0 ? signalLines.join("\n") : "- None",
      "",
      "DOCUMENTS (recent):",
      documentLines.length > 0 ? documentLines.join("\n") : "- None",
      "",
      "OPPORTUNITIES:",
      opportunityLines.length > 0 ? opportunityLines.join("\n") : "- None",
    ].join("\n");

    // 4. Cap context to safe limit (~2-4k chars)
    const cappedContext = capPromptLength(contextText, 4000);

    // 5. Build LLM prompt with persona-specific instructions
    const personaDescriptions: Record<OutboundPersona, string> = {
      cio: "Chief Information Officer - focused on IT strategy, digital transformation, and technology investments",
      cfo: "Chief Financial Officer - focused on cost optimization, ROI, and financial performance",
      cmo: "Chief Medical Officer - focused on clinical outcomes, quality, and patient care",
      cnio: "Chief Nursing Informatics Officer - focused on nursing workflows, EHR optimization, and clinical informatics",
      cmio: "Chief Medical Informatics Officer - focused on clinical systems, interoperability, and physician engagement",
      operations_leader: "Operations Leader - focused on efficiency, process improvement, and operational excellence",
      it_director: "IT Director - focused on infrastructure, security, and day-to-day IT operations",
    };

    const prompt = [
      "You are a healthcare IT sales strategist. Generate a concise outbound playbook for engaging with a specific healthcare system.",
      `Target Persona: ${params.persona.toUpperCase()} - ${personaDescriptions[params.persona]}`,
      "",
      "Context:",
      cappedContext,
      "",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        summary: "string (2-3 paragraphs summarizing the system and why to engage)",
        keyThemes: ["string (max 5 key themes/insights)"],
        recommendedTargets: ["string (max 5 specific roles/titles to target)"],
        talkingPoints: [
          {
            title: "string",
            rationale: "string (why this matters to the persona)",
            evidence: ["string (short references to signals/docs, not URLs)"],
          },
        ],
        snippets: [
          {
            channel: "email or call or linkedin",
            persona: params.persona,
            subject: "string (for email/LinkedIn, null for call)",
            opener: "string (first sentence/paragraph)",
            coreMessage: "string (main value proposition)",
            callToAction: "string (specific next step)",
          },
        ],
      }),
      "",
      "Requirements:",
      "- Generate 3-5 talking points",
      "- Generate 2-4 snippets across different channels (at least one email, one call)",
      "- All snippets must use the specified persona",
      "- Evidence should reference specific signals or documents briefly (e.g., 'Recent cybersecurity incident', 'Q3 financial results')",
      "- Keep all text concise and actionable",
    ].join("\n\n");

    // 6. Call LLM
    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      logger.error(new Error("No text in OpenAI response"), "Failed to generate outbound playbook", {
        systemId: system.id,
        persona: params.persona,
      });
      return null;
    }

    // 7. Parse and validate
    let parsed: ModelOutput;
    try {
      parsed = JSON.parse(rawOutput) as ModelOutput;
    } catch (error) {
      logger.error(error, "Failed to parse outbound playbook JSON", { rawOutput, systemId: system.id });
      return null;
    }

    // Validate structure
    if (
      typeof parsed.summary !== "string" ||
      parsed.summary.trim().length === 0 ||
      !Array.isArray(parsed.keyThemes) ||
      parsed.keyThemes.length > 5 ||
      !Array.isArray(parsed.recommendedTargets) ||
      parsed.recommendedTargets.length > 5 ||
      !Array.isArray(parsed.talkingPoints) ||
      !Array.isArray(parsed.snippets)
    ) {
      logger.error(
        new Error("Invalid playbook structure"),
        "Invalid outbound playbook structure",
        { parsed, systemId: system.id },
      );
      return null;
    }

    // Validate snippets
    for (const snippet of parsed.snippets) {
      if (
        !["email", "call", "linkedin"].includes(snippet.channel) ||
        snippet.persona !== params.persona ||
        typeof snippet.opener !== "string" ||
        typeof snippet.coreMessage !== "string" ||
        typeof snippet.callToAction !== "string"
      ) {
        logger.error(
          new Error("Invalid snippet structure"),
          "Invalid snippet in outbound playbook",
          { snippet, systemId: system.id },
        );
        return null;
      }
    }

    // 8. Wrap with system metadata
    return {
      systemId: system.id,
      systemSlug: system.slug,
      systemName: system.name,
      persona: params.persona,
      summary: parsed.summary,
      keyThemes: parsed.keyThemes,
      recommendedTargets: parsed.recommendedTargets,
      talkingPoints: parsed.talkingPoints,
      snippets: parsed.snippets,
    };
  } catch (error) {
    logger.error(error, "Error generating outbound playbook", { systemSlug: params.systemSlug, persona: params.persona });
    return null;
  }
}

