import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { error: systemsError } = await supabase
    .from("systems")
    .select("id")
    .limit(1);

  const supabaseOk = !systemsError;

  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  const firecrawlConfigured = !!process.env.FIRECRAWL_API_KEY;

  return NextResponse.json({
    ok: supabaseOk && openaiConfigured && firecrawlConfigured,
    supabase: supabaseOk ? "ok" : "error",
    openaiConfigured,
    firecrawlConfigured,
    timestamp: new Date().toISOString(),
  });
}

