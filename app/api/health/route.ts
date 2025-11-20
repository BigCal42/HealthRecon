import { apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { config } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { NextResponse } from "next/server";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const ctx = createRequestContext("/api/health");
  ctx.logInfo("Health check request received");

  const supabase = createServerSupabaseClient();

  const { error: systemsError } = await supabase
    .from("systems")
    .select("id")
    .limit(1);

  const supabaseOk = !systemsError;

  const openaiConfigured = !!config.openai.apiKey;
  const firecrawlConfigured = !!config.FIRECRAWL_API_KEY;

  return apiSuccess({
    ok: supabaseOk && openaiConfigured && firecrawlConfigured,
    supabase: supabaseOk ? "ok" : "error",
    openaiConfigured,
    firecrawlConfigured,
    timestamp: new Date().toISOString(),
  });
}

