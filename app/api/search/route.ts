import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { globalSearch } from "@/lib/search";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createServerSupabaseClient();
    const results = await globalSearch(supabase, q, 10);

    return NextResponse.json({ results });
  } catch (error) {
    logger.error(error, "Search failed");
    return NextResponse.json(
      { results: [], error: "search_failed" },
      { status: 500 },
    );
  }
}

