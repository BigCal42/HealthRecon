import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";

export async function classifySystem(
  text: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data: systems, error } = await supabase
      .from("systems")
      .select("slug, name")
      .returns<{ slug: string; name: string }[]>();

    if (error || !systems || systems.length === 0) {
      return null;
    }

    const systemsList = systems
      .map((s) => `${s.slug}: ${s.name}`)
      .join("\n");

    // Cap article text to prevent excessive token usage (20k chars ~= 5k tokens)
    const MAX_TEXT_LENGTH = 20_000;
    const cappedText = text.length > MAX_TEXT_LENGTH 
      ? text.substring(0, MAX_TEXT_LENGTH) + "\n\n[Content truncated...]"
      : text;

    const prompt = [
      "Given a news article text and a list of health systems, return the slug of the system the article most likely refers to. Return null if none. Only return valid JSON with a 'slug' field (string or null).",
      "Available systems:",
      systemsList,
      "Article text:",
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
      return null;
    }

    const parsed = JSON.parse(jsonText) as { slug?: string | null };

    if (!parsed.slug || typeof parsed.slug !== "string") {
      return null;
    }

    const slug = parsed.slug.trim();

    const isValidSlug = systems.some((s) => s.slug === slug);

    return isValidSlug ? slug : null;
  } catch (error) {
    logger.error(error, "Classification error");
    return null;
  }
}

