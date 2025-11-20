import type { SupabaseClient } from "@supabase/supabase-js";

import type { ExtractionResult } from "@/lib/extractionSchema";
import { logger } from "@/lib/logger";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";

type DocumentRow = {
  id: string;
  system_id: string;
  title: string | null;
  raw_text: string | null;
  source_url: string | null;
};

export async function runProcessForSystem(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ processed: number }> {
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (systemError || !system) {
    throw new Error("System not found");
  }

  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, system_id, title, raw_text, source_url")
    .eq("system_id", system.id)
    .eq("processed", false)
    .limit(3)
    .returns<DocumentRow[]>();

  if (error) {
    logger.error(error, "Failed to load documents");
    return { processed: 0 };
  }

  if (!docs || docs.length === 0) {
    return { processed: 0 };
  }

  for (const doc of docs) {
    try {
      let processedSuccessfully = true;

      // Cap raw_text to prevent excessive token usage (50k chars ~= 12k tokens)
      const MAX_TEXT_LENGTH = 50_000;
      const rawText = doc.raw_text ?? "";
      const cappedText = rawText.length > MAX_TEXT_LENGTH 
        ? rawText.substring(0, MAX_TEXT_LENGTH) + "\n\n[Content truncated...]"
        : rawText;

      const prompt = [
        "You extract structured entities and signals about a healthcare system from a single webpage. Only return valid JSON matching the specified schema. Do not include any explanatory text.",
        "Extract entities and signals from the following document.",
        `Title: ${doc.title ?? ""}`,
        `URL: ${doc.source_url ?? ""}`,
        cappedText,
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await createResponse({
        prompt,
        format: "json_object",
      });

      const jsonText = extractTextFromResponse(response);

      if (!jsonText) {
        throw new Error("OpenAI response did not include text output.");
      }

      const parsed = JSON.parse(jsonText) as ExtractionResult;

      const entities = parsed.entities ?? [];
      const signals = parsed.signals ?? [];

      // Batch insert entities
      if (entities.length > 0) {
        const entityRows = entities.map((entity) => ({
          system_id: doc.system_id,
          type: entity.type,
          name: entity.name,
          role: entity.role ?? null,
          attributes: entity.attributes ?? null,
          source_document_id: doc.id,
        }));

        const { error: entityError } = await supabase.from("entities").insert(entityRows);

        if (entityError) {
          logger.error(entityError, "Failed to insert entities", { count: entities.length });
          processedSuccessfully = false;
        }
      }

      // Batch insert signals
      if (signals.length > 0) {
        const signalRows = signals.map((signal) => ({
          system_id: doc.system_id,
          document_id: doc.id,
          severity: signal.severity,
          category: signal.category,
          summary: signal.summary,
          details: signal.details ?? null,
        }));

        const { error: signalError } = await supabase.from("signals").insert(signalRows);

        if (signalError) {
          logger.error(signalError, "Failed to insert signals", { count: signals.length });
          processedSuccessfully = false;
        }
      }

      if (!processedSuccessfully) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update({ processed: true })
        .eq("id", doc.id);

      if (updateError) {
        logger.error(updateError, "Failed to mark document processed");
      }
    } catch (err) {
      logger.error(err, "Failed to process document", { documentId: doc.id });
    }
  }

  return { processed: docs.length };
}

