import type { SupabaseClient } from "@supabase/supabase-js";

import { hashText } from "@/lib/hash";

type FirecrawlPage = {
  url: string;
  title?: string;
  content?: string;
};

type FirecrawlResponse = {
  success: boolean;
  pages?: FirecrawlPage[];
};

export async function runIngestForSystem(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ created: number }> {
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (systemError || !system) {
    throw new Error("System not found");
  }

  const { data: seeds, error: seedsError } = await supabase
    .from("system_seeds")
    .select("url")
    .eq("system_id", system.id)
    .eq("active", true)
    .returns<{ url: string }[]>();

  if (seedsError || !seeds || seeds.length === 0) {
    throw new Error("No active seed URLs found for system");
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("Firecrawl API key is not configured");
  }

  const created: string[] = [];

  for (const seed of seeds) {
    try {
      const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url: seed.url }),
      });

      if (!firecrawlRes.ok) {
        console.error(`Firecrawl request failed for ${seed.url}`);
        continue;
      }

      const payload = (await firecrawlRes.json()) as FirecrawlResponse;
      const pages = payload.pages ?? [];

      if (!payload.success || pages.length === 0) {
        continue;
      }

      for (const page of pages) {
        if (!page.content) {
          continue;
        }

        const hash = hashText(page.content);

        const { data: existing } = await supabase
          .from("documents")
          .select("id")
          .eq("system_id", system.id)
          .eq("hash", hash)
          .maybeSingle<{ id: string }>();

        if (existing) {
          continue;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("documents")
          .insert({
            system_id: system.id,
            source_url: page.url ?? seed.url,
            source_type: "website",
            title: page.title ?? null,
            raw_text: page.content,
            hash,
          })
          .select("id")
          .maybeSingle<{ id: string }>();

        if (insertError || !inserted) {
          continue;
        }

        created.push(inserted.id);
      }
    } catch (error) {
      console.error(`Error processing seed URL ${seed.url}:`, error);
      continue;
    }
  }

  return { created: created.length };
}

