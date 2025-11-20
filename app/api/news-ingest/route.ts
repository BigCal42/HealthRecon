import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { crawlUrl, type FirecrawlPage, type FirecrawlResponse } from "@/lib/firecrawlClient";
import { hashText } from "@/lib/hash";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Firecrawl and Supabase integrations
export const runtime = "nodejs";

export async function POST() {
  const ctx = createRequestContext("/api/news-ingest");
  ctx.logInfo("News ingest request received");

  try {
    const supabase = createServerSupabaseClient();

    const { data: newsSources, error: sourcesError } = await supabase
      .from("news_sources")
      .select("id, name, url")
      .eq("active", true);

    if (sourcesError || !newsSources || newsSources.length === 0) {
      return apiError(404, "no_sources", "No active news sources found");
    }

    let documentsCreated = 0;

    for (const source of newsSources) {
      try {
        const payload = await crawlUrl(source.url);
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
            .is("system_id", null)
            .eq("hash", hash)
            .maybeSingle<{ id: string }>();

          if (existing) {
            continue;
          }

          const { data: inserted, error: insertError } = await supabase
            .from("documents")
            .insert({
              system_id: null,
              source_url: page.url ?? source.url,
              source_type: "news",
              title: page.title ?? null,
              raw_text: page.content,
              hash,
            })
            .select("id")
            .maybeSingle<{ id: string }>();

          if (insertError || !inserted) {
            continue;
          }

          documentsCreated++;
        }
      } catch (error) {
        ctx.logError(error, "Error processing news source", { url: source.url });
        continue;
      }
    }

    ctx.logInfo("News ingestion completed successfully", { sources: newsSources.length, documentsCreated });
    return apiSuccess({
      sources: newsSources.length,
      documents_created: documentsCreated,
    });
  } catch (error) {
    ctx.logError(error, "News ingestion error");
    const errorMessage = error instanceof Error ? error.message : "Unexpected server error";

    if (errorMessage === "Firecrawl API key is not configured") {
      return apiError(500, "config_error", "Firecrawl API key is not configured");
    }

    return apiError(500, "ingestion_failed", "Unexpected server error");
  }
}

