import { NextResponse } from "next/server";

import { openai } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { ExtractionResult } from "@/lib/extractionSchema";

export async function POST() {
  const supabase = createServerSupabaseClient();

  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, system_id, title, raw_text, source_url")
    .eq("processed", false)
    .limit(3);

  if (error) {
    console.error("Failed to load documents", error);
    return NextResponse.json({ processed: 0 });
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  for (const doc of docs) {
    try {
      let processedSuccessfully = true;

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        input: [
          {
            role: "system",
            content:
              "You extract structured entities and signals about a healthcare system from a single webpage. Only return valid JSON matching the specified schema. Do not include any explanatory text.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract entities and signals from the following document." },
              { type: "text", text: `Title: ${doc.title ?? ""}` },
              { type: "text", text: `URL: ${doc.source_url}` },
              { type: "text", text: doc.raw_text ?? "" },
            ],
          },
        ],
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
          console.error("Failed to insert entity", entityError);
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
          console.error("Failed to insert signal", signalError);
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
        console.error("Failed to mark document processed", updateError);
      }
    } catch (err) {
      console.error("Failed to process document", doc.id, err);
    }
  }

  return NextResponse.json({
    processed: docs.length,
  });
}

