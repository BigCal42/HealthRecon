import type { SupabaseClient } from "@supabase/supabase-js";

import { createResponse } from "@/lib/openaiClient";
import type { ExtractionResult } from "@/lib/extractionSchema";
import { logger } from "@/lib/logger";

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

      const prompt = [
        "You extract structured entities and signals about a healthcare system from a single webpage. Only return valid JSON matching the specified schema. Do not include any explanatory text.",
        "Extract entities and signals from the following document.",
        `Title: ${doc.title ?? ""}`,
        `URL: ${doc.source_url ?? ""}`,
        doc.raw_text ?? "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await createResponse({
        prompt,
        format: "json_object",
      });

      const jsonText =
        (response as any)?.output_text ??
        (response as any)?.output?.[0]?.content?.[0]?.text;

      if (!jsonText) {
        throw new Error("OpenAI response did not include text output.");
      }

      const parsed = JSON.parse(jsonText) as ExtractionResult;

      const entities = parsed.entities ?? [];
      const signals = parsed.signals ?? [];

      for (const entity of entities) {
        const { error: entityError } = await supabase.from("entities").insert({
          system_id: doc.system_id,
          type: entity.type,
          name: entity.name,
          role: entity.role ?? null,
          attributes: entity.attributes ?? null,
          source_document_id: doc.id,
        });

        if (entityError) {
          logger.error(entityError, "Failed to insert entity");
          processedSuccessfully = false;
        }
      }

      for (const signal of signals) {
        const { error: signalError } = await supabase.from("signals").insert({
          system_id: doc.system_id,
          document_id: doc.id,
          severity: signal.severity,
          category: signal.category,
          summary: signal.summary,
          details: signal.details ?? null,
        });

        if (signalError) {
          logger.error(signalError, "Failed to insert signal");
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
      logger.error(err, "Failed to process document", doc.id);
    }
  }

  return { processed: docs.length };
}

