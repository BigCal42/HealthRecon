import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { hashText } from "@/lib/hash";
import { BILH_SLUG } from "@/config/constants";

type FirecrawlPage = {
  url: string;
  title?: string;
  content?: string;
};

type FirecrawlResponse = {
  success: boolean;
  pages?: FirecrawlPage[];
};

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing url in request body" },
        { status: 400 },
      );
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key is not configured" },
        { status: 500 },
      );
    }

    const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!firecrawlRes.ok) {
      return NextResponse.json(
        { error: "Firecrawl request failed" },
        { status: 502 },
      );
    }

    const payload = (await firecrawlRes.json()) as FirecrawlResponse;
    const pages = payload.pages ?? [];

    if (!payload.success || pages.length === 0) {
      return NextResponse.json({ created: [] });
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", BILH_SLUG)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return NextResponse.json(
        { error: "System not found" },
        { status: 500 },
      );
    }

    const created: string[] = [];

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
          source_url: page.url ?? url,
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

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

