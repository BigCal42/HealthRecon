import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { capPromptLength, createResponse, extractTextFromResponse } from "@/lib/openaiClient";

export interface MeetingPrepInput {
  systemSlug: string;
  meetingType: "intro" | "discovery" | "strategy_review" | "renewal" | "exec_briefing";
  audienceDescription?: string | null;
  myObjective?: string | null;
  timeBoxMinutes?: number | null;
}

export interface MeetingPrepSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface MeetingPrepBrief {
  systemId: string;
  systemSlug: string;
  systemName: string;
  meetingType: MeetingPrepInput["meetingType"];
  executiveSummary: string;
  objectives: string[];
  sections: MeetingPrepSection[];
  suggestedQuestions: string[];
  potentialRisksOrLandmines: string[];
  suggestedNextSteps: string[];
}

type MeetingPrepModelOutput = {
  executiveSummary: string;
  objectives: string[];
  sections: Array<{
    title: string;
    body: string;
    bullets?: string[];
  }>;
  suggestedQuestions: string[];
  potentialRisksOrLandmines: string[];
  suggestedNextSteps: string[];
};

const MeetingPrepModelOutputSchema = z.object({
  executiveSummary: z.string().min(1),
  objectives: z.array(z.string()),
  sections: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      bullets: z.array(z.string()).optional(),
    }),
  ),
  suggestedQuestions: z.array(z.string()),
  potentialRisksOrLandmines: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
});

const DAYS_90_MS = 90 * 24 * 60 * 60 * 1000;

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

type OpportunityRow = {
  id: string;
  title: string | null;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  close_date: string | null;
  updated_at: string | null;
};

type InteractionRow = {
  id: string;
  channel: string | null;
  subject: string | null;
  summary: string | null;
  occurred_at: string | null;
};

export async function getMeetingPrep(
  supabase: SupabaseClient,
  input: MeetingPrepInput,
): Promise<MeetingPrepBrief | null> {
  try {
    // 1. Resolve system
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("slug", input.systemSlug)
      .maybeSingle<SystemRow>();

    if (systemError || !system) {
      logger.warn("System not found for meeting prep", {
        systemSlug: input.systemSlug,
        error: systemError,
      });
      return null;
    }

    // 2. Gather context (last 90 days for signals, recent opportunities, recent interactions)
    const sinceIso = new Date(Date.now() - DAYS_90_MS).toISOString();

    const [
      { data: signals, error: signalsError },
      { data: opportunities, error: opportunitiesError },
      { data: interactions, error: interactionsError },
    ] = await Promise.all([
      supabase
        .from("signals")
        .select("id, category, severity, summary, created_at")
        .eq("system_id", system.id)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<SignalRow[]>(),
      supabase
        .from("opportunities")
        .select("id, title, stage, amount, currency, status, close_date, updated_at")
        .eq("system_id", system.id)
        .order("updated_at", { ascending: false })
        .limit(10)
        .returns<OpportunityRow[]>(),
      supabase
        .from("interactions")
        .select("id, channel, subject, summary, occurred_at")
        .eq("system_id", system.id)
        .order("occurred_at", { ascending: false })
        .limit(10)
        .returns<InteractionRow[]>(),
    ]);

    if (signalsError) {
      logger.error(signalsError, "Failed to fetch signals for meeting prep", {
        systemId: system.id,
      });
    }
    if (opportunitiesError) {
      logger.error(opportunitiesError, "Failed to fetch opportunities for meeting prep", {
        systemId: system.id,
      });
    }
    if (interactionsError) {
      logger.error(interactionsError, "Failed to fetch interactions for meeting prep", {
        systemId: system.id,
      });
    }

    // 3. Build compact, capped context string
    const locationParts: string[] = [];
    if (system.hq_city) locationParts.push(system.hq_city);
    if (system.hq_state) locationParts.push(system.hq_state);
    const location = locationParts.length > 0 ? locationParts.join(", ") : "Unknown";

    const signalLines =
      (signals ?? []).length > 0
        ? (signals ?? [])
            .slice(0, 10)
            .map(
              (s) =>
                `- [${s.severity ?? "unknown"}/${s.category ?? "unknown"}] ${s.summary ?? "No summary"} (${s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "unknown date"})`,
            )
        : ["- None"];

    const opportunityLines =
      (opportunities ?? []).length > 0
        ? (opportunities ?? [])
            .slice(0, 5)
            .map(
              (o) =>
                `- ${o.title ?? "Untitled"} | ${o.stage ?? "unknown"} | ${o.status ?? "unknown"}${o.amount ? ` | ${o.currency ?? "$"}${o.amount.toLocaleString()}` : ""}${o.close_date ? ` | close: ${new Date(o.close_date).toISOString().split("T")[0]}` : ""}`,
            )
        : ["- None"];

    const interactionLines =
      (interactions ?? []).length > 0
        ? (interactions ?? [])
            .slice(0, 5)
            .map(
              (i) =>
                `- ${i.channel ?? "unknown"} | ${i.subject ?? i.summary ?? "No subject"} | ${i.occurred_at ? new Date(i.occurred_at).toISOString().split("T")[0] : "unknown date"}`,
            )
        : ["- None"];

    const contextText = [
      "SYSTEM:",
      `- Name: ${system.name}`,
      `- Location: ${location}`,
      system.website ? `- Website: ${system.website}` : "",
      "",
      "MEETING:",
      `- Type: ${input.meetingType}`,
      `- Audience: ${input.audienceDescription ?? "not specified"}`,
      `- My objective: ${input.myObjective ?? "not specified"}`,
      `- Timebox: ${input.timeBoxMinutes ?? "not specified"} minutes`,
      "",
      "RECENT SIGNALS (max 10):",
      ...signalLines,
      "",
      "PIPELINE (max 5 opps):",
      ...opportunityLines,
      "",
      "RECENT INTERACTIONS (max 5):",
      ...interactionLines,
    ]
      .filter(Boolean)
      .join("\n");

    const cappedContext = capPromptLength(contextText, 40000);

    // 4. LLM call
    const meetingTypeDescriptions: Record<MeetingPrepInput["meetingType"], string> = {
      intro: "Initial introduction meeting - focus on building rapport and understanding their needs",
      discovery: "Discovery meeting - gather information about their challenges and priorities",
      strategy_review: "Strategic review meeting - discuss long-term plans and alignment",
      renewal: "Renewal meeting - focus on value delivered and future opportunities",
      exec_briefing: "Executive briefing - high-level strategic discussion with C-suite",
    };

    const timeboxGuidance =
      input.timeBoxMinutes && input.timeBoxMinutes < 45
        ? "Keep sections concise and focused due to limited time."
        : "";

    const prompt = [
      "You are a healthcare IT sales strategist preparing for a meeting with a health system stakeholder.",
      "Generate a structured meeting prep brief that is concise but actionable.",
      "",
      "Context:",
      cappedContext,
      "",
      `Meeting Type: ${input.meetingType} - ${meetingTypeDescriptions[input.meetingType]}`,
      timeboxGuidance,
      "",
      "Generate a JSON object with the following structure:",
      JSON.stringify({
        executiveSummary: "string - 2-3 paragraph executive summary",
        objectives: ["string - 3-7 clear objectives for this meeting"],
        sections: [
          {
            title: "string",
            body: "string - 2-3 sentences",
            bullets: ["string - optional bullet points"],
          },
        ],
        suggestedQuestions: ["string - 5-10 questions to ask"],
        potentialRisksOrLandmines: ["string - things to avoid or be careful about"],
        suggestedNextSteps: ["string - concrete follow-up actions"],
      }),
      "",
      "Requirements:",
      "- Generate 3-5 sections relevant to the meeting type",
      "- Respect the timebox (fewer sections for shorter meetings)",
      "- All content should be sales/business development focused",
      "- Return only valid JSON, no explanatory text",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      logger.error(new Error("No output from OpenAI"), "Meeting prep generation failed - no output", {
        systemId: system.id,
      });
      return null;
    }

    // 5. Validate JSON
    let parsed: MeetingPrepModelOutput;
    try {
      parsed = JSON.parse(rawOutput) as MeetingPrepModelOutput;
    } catch (error) {
      logger.error(error, "Failed to parse meeting prep JSON", {
        rawOutput,
        systemId: system.id,
      });
      return null;
    }

    // Validate with Zod
    const validationResult = MeetingPrepModelOutputSchema.safeParse(parsed);
    if (!validationResult.success) {
      logger.error(validationResult.error, "Meeting prep validation failed", {
        systemId: system.id,
        parsed,
      });
      return null;
    }

    const validated = validationResult.data;

    // Validate reasonable lengths
    if (
      validated.executiveSummary.trim().length === 0 ||
      validated.objectives.length === 0 ||
      validated.suggestedQuestions.length === 0
    ) {
      logger.error(new Error("Invalid meeting prep structure"), "Meeting prep validation failed - empty required fields", {
        systemId: system.id,
      });
      return null;
    }

    // 6. Return validated object with system metadata
    return {
      systemId: system.id,
      systemSlug: system.slug,
      systemName: system.name,
      meetingType: input.meetingType,
      executiveSummary: validated.executiveSummary,
      objectives: validated.objectives,
      sections: validated.sections,
      suggestedQuestions: validated.suggestedQuestions,
      potentialRisksOrLandmines: validated.potentialRisksOrLandmines,
      suggestedNextSteps: validated.suggestedNextSteps,
    };
  } catch (error) {
    logger.error(error, "Error generating meeting prep", { systemSlug: input.systemSlug });
    return null;
  }
}

