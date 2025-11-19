import { NextResponse } from "next/server";

import { hashText } from "@/lib/hash";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type FirecrawlPage = {
  url: string;
  title?: string;
  content?: string;
};

type FirecrawlResponse = {
  success: boolean;
  pages?: FirecrawlPage[];
};

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: newsSources, error: sourcesError } = await supabase
      .from("news_sources")
      .select("id, name, url")
      .eq("active", true);

    if (sourcesError || !newsSources || newsSources.length === 0) {
      return NextResponse.json(
        { error: "No active news sources found" },
        { status: 404 },
      );
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key is not configured" },
        { status: 500 },
      );
    }

    let documentsCreated = 0;

    for (const source of newsSources) {
      try {
        const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ url: source.url }),
        });

        if (!firecrawlRes.ok) {
          logger.error(new Error("Firecrawl request failed"), "Firecrawl request failed", {
            url: source.url,
          });
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
        logger.error(error, "Error processing news source", { url: source.url });
        continue;
      }
    }

    return NextResponse.json({
      sources: newsSources.length,
      documents_created: documentsCreated,
    });
  } catch (error) {
    logger.error(error, "News ingestion error");
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

