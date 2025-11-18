import { NextResponse } from "next/server";

import { BILH_SLUG } from "@/config/constants";
import { logger } from "@/lib/logger";
import { runIngestForSystem } from "@/lib/pipeline/ingest";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    let slug = BILH_SLUG;

    try {
      const body = (await request.json()) as { slug?: string };
      if (body && typeof body === "object" && typeof body.slug === "string") {
        slug = body.slug;
      }
    } catch {
      // Ignore invalid / missing JSON bodies, default slug applies.
    }

    const supabase = createServerSupabaseClient();
    const result = await runIngestForSystem(supabase, slug);

    return NextResponse.json({ slug, created: result.created });
  } catch (error) {
    logger.error(error, "Ingestion error");
    const errorMessage = error instanceof Error ? error.message : "Unexpected server error";

    if (errorMessage === "System not found") {
      return NextResponse.json(
        { error: "System not found" },
        { status: 404 },
      );
    }

    if (errorMessage === "No active seed URLs found for system") {
      return NextResponse.json(
        { error: "No active seed URLs found for system" },
        { status: 404 },
      );
    }

    if (errorMessage === "Firecrawl API key is not configured") {
      return NextResponse.json(
        { error: "Firecrawl API key is not configured" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

